"""DidUP app API client used by the Android background worker."""
from __future__ import annotations

import hashlib
import io
import json
import re
import secrets
import string
import urllib.parse
import urllib.request
import zipfile
from pathlib import PurePosixPath
from typing import Any

from didup_auth import AuthError, USER_AGENT, _opener, _request, oauth_login

API_BASE = "https://www.portaleargo.it/appfamiglia/api/rest/"


class DidupError(Exception):
    def __init__(self, code: str, retryable: bool = False):
        super().__init__(code)
        self.code = code
        self.retryable = retryable


class _SafeAttachmentRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, file_pointer, code, message, headers, new_url):
        destination = urllib.parse.urlparse(urllib.parse.urljoin(request.full_url, new_url))
        host = (destination.hostname or "").casefold()
        allowed = (
            destination.scheme == "https"
            and (host == "portaleargo.it" or host.endswith(".portaleargo.it")
                 or host == "amazonaws.com" or host.endswith(".amazonaws.com"))
            and not destination.username and not destination.password
        )
        if not allowed:
            return None
        return super().redirect_request(request, file_pointer, code, message, headers, destination.geturl())


def _random_client_id(length: int = 163) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _camel(name: str) -> str:
    parts = name.split("_")
    return parts[0] + "".join(part[:1].upper() + part[1:] for part in parts[1:])


def _get(value: Any, *names: str, default: Any = None) -> Any:
    if not isinstance(value, dict):
        return default
    for name in names:
        for candidate in (name, _camel(name)):
            if candidate in value and value[candidate] not in (None, ""):
                return value[candidate]
    return default


def _extract_dashboard(response: Any) -> dict[str, Any]:
    content = response.get("data", response) if isinstance(response, dict) else response
    if isinstance(content, dict) and "dati" in content:
        items = content.get("dati")
        if isinstance(items, list) and items and isinstance(items[0], dict):
            return items[0]
        raise DidupError("didup_dashboard_empty")
    if not isinstance(content, dict):
        raise DidupError("didup_dashboard_invalid")
    return content


class DidupClient:
    def __init__(self, school_code: str, username: str, password: str):
        self.school_code = school_code.strip()
        self.username = username.strip()
        self.password = password
        self.opener = _opener(redirects=True)
        self.access_token = ""
        self.api_version = "1.29.2"
        self.profile_login: dict[str, Any] = {}

    def _api(self, method: str, path: str, *, payload: dict[str, Any] | None = None,
             include_profile: bool = True):
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": USER_AGENT,
            "argo-client-version": self.api_version,
        }
        if self.access_token:
            headers["Authorization"] = "Bearer " + self.access_token
        if include_profile and self.profile_login:
            token = self.profile_login.get("token")
            cod_min = self.profile_login.get("codMin") or self.profile_login.get("cod_min")
            if token:
                headers["x-auth-token"] = str(token)
            if cod_min:
                headers["x-cod-min"] = str(cod_min)
        data = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8") if payload is not None else None
        url = urllib.parse.urljoin(API_BASE, path)
        try:
            status, _, body = _request(self.opener, method, url, data=data, headers=headers, timeout=60)
        except Exception:
            raise DidupError("didup_network", retryable=True)
        if status in (401, 403):
            raise DidupError("didup_credentials_rejected")
        if status == 429 or status >= 500:
            raise DidupError("didup_temporarily_unavailable", retryable=True)
        if status < 200 or status >= 300:
            raise DidupError("didup_api_error")
        try:
            result = json.loads(body.decode("utf-8")) if body else {}
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise DidupError("didup_response_invalid", retryable=True)
        if isinstance(result, dict) and result.get("success") is False:
            message = str(result.get("msg") or "").casefold()
            if any(word in message for word in ("credenzial", "password", "autentic", "token")):
                raise DidupError("didup_credentials_rejected")
            raise DidupError("didup_api_error")
        return result

    def login(self) -> tuple[dict[str, Any], dict[str, Any]]:
        token_data = oauth_login(self.school_code, self.username, self.password)
        self.access_token = token_data["access_token"]
        self.api_version = token_data.get("version") or "1.29.2"
        response = self._api(
            "POST",
            "login",
            payload={
                "lista-opzioni-notifiche": "{}",
                "lista-x-auth-token": "[]",
                "clientID": _random_client_id(),
            },
            include_profile=False,
        )
        profiles = response.get("data") if isinstance(response, dict) else None
        if not isinstance(profiles, list) or not profiles:
            raise DidupError("didup_profile_missing")
        active_profiles = [profile for profile in profiles
                           if isinstance(profile, dict) and not profile.get("profiloDisabilitato")]
        if not active_profiles:
            raise DidupError("didup_profile_disabled")
        self.profile_login = active_profiles[0]
        options = self.profile_login.get("opzioni") or []
        option_map = {
            entry.get("chiave"): entry.get("valore")
            for entry in options
            if isinstance(entry, dict) and entry.get("chiave") is not None
        }
        dashboard_response = self._api(
            "POST",
            "dashboard/dashboard",
            payload={
                "dataultimoaggiornamento": "2000-01-01 00:00:00.000",
                "opzioni": json.dumps(option_map, ensure_ascii=False, separators=(",", ":")),
            },
        )
        dashboard = _extract_dashboard(dashboard_response)
        profile = self._profile()
        return dashboard, profile

    def _profile(self) -> dict[str, Any]:
        try:
            response = self._api("GET", "profilo")
            data = response.get("data", {}) if isinstance(response, dict) else {}
            student = data.get("alunno", {}) if isinstance(data, dict) else {}
            return student if isinstance(student, dict) else {}
        except DidupError:
            return {}

    def download_attachment(self, uid: str, filename: str) -> dict[str, Any]:
        """Fetch a fresh official attachment URL and validate a PDF or DOCX file."""
        if not uid or len(uid) > 256:
            raise DidupError("didup_attachment_unavailable", retryable=True)
        response = self._api("POST", "downloadallegatobacheca", payload={"uid": uid})
        raw_url = response.get("url") if isinstance(response, dict) else None
        if not raw_url and isinstance(response, dict):
            raw_data = response.get("data")
            if isinstance(raw_data, dict):
                raw_url = raw_data.get("url")
        if not isinstance(raw_url, str) or not raw_url.strip():
            raise DidupError("didup_attachment_unavailable", retryable=True)
        url = urllib.parse.urljoin(API_BASE, raw_url.strip())
        parsed = urllib.parse.urlparse(url)
        host = (parsed.hostname or "").casefold()
        allowed = (
            parsed.scheme == "https"
            and (host == "portaleargo.it" or host.endswith(".portaleargo.it")
                 or host == "amazonaws.com" or host.endswith(".amazonaws.com"))
            and not parsed.username and not parsed.password
        )
        if not allowed:
            raise DidupError("didup_attachment_unavailable", retryable=True)

        # Do not forward DidUP bearer/profile headers to the returned storage URL.
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,*/*"})
        try:
            opener = urllib.request.build_opener(_SafeAttachmentRedirect())
            with opener.open(request, timeout=45) as downloaded:
                final = urllib.parse.urlparse(downloaded.geturl())
                final_host = (final.hostname or "").casefold()
                if final.scheme != "https" or not (
                    final_host == "portaleargo.it" or final_host.endswith(".portaleargo.it")
                    or final_host == "amazonaws.com" or final_host.endswith(".amazonaws.com")
                ):
                    raise DidupError("didup_attachment_unavailable", retryable=True)
                content = downloaded.read(25 * 1024 * 1024 + 1)
                if len(content) > 25 * 1024 * 1024:
                    raise DidupError("didup_attachment_too_large")
        except DidupError:
            raise
        except Exception:
            raise DidupError("didup_attachment_unavailable", retryable=True)

        suffix = PurePosixPath(filename or "").suffix.casefold()
        if content.startswith(b"%PDF-"):
            extension = "pdf"
            mime = "application/pdf"
            if suffix and suffix != ".pdf":
                raise DidupError("didup_attachment_invalid")
        elif content[:4] == b"PK\x03\x04":
            extension = "docx"
            mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            if suffix and suffix != ".docx":
                raise DidupError("didup_attachment_invalid")
            try:
                with zipfile.ZipFile(io.BytesIO(content)) as archive:
                    names = set(archive.namelist())
                if "[Content_Types].xml" not in names or "word/document.xml" not in names:
                    raise DidupError("didup_attachment_invalid")
            except DidupError:
                raise
            except Exception:
                raise DidupError("didup_attachment_invalid")
        else:
            raise DidupError("didup_attachment_invalid")

        digest = hashlib.sha256(content).hexdigest()
        return {
            "content": content,
            "extension": extension,
            "mime": mime,
            "sha256": digest,
            "path": f"circulars/{digest}.{extension}",
        }
