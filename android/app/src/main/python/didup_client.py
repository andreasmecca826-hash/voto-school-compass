"""DidUP app API client used by the Android background worker."""
from __future__ import annotations

import hashlib
import io
import json
import re
import secrets
import string
import time
import urllib.parse
import urllib.error
import urllib.request
import zipfile
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import PurePosixPath
from typing import Any

from didup_auth import AuthError, USER_AGENT, _opener, _request, oauth_login

API_BASE = "https://www.portaleargo.it/appfamiglia/api/rest/"
WEB_API_BASE = "https://didattica.portaleargo.it/famiglia/api/"
WEB_API_VERSION = "4.3.0"

# Errori transitori (429/5xx): l'app ritenta da sola, come fa il monitor,
# invece di mostrare subito un errore per un singolo picco del server.
TRANSIENT_RETRY_DELAYS = (2.0, 8.0)
MAX_TRANSIENT_ATTEMPTS = len(TRANSIENT_RETRY_DELAYS) + 1
MAX_RETRY_AFTER_SECONDS = 30.0


def _header(headers: Any, name: str) -> str:
    """Legge un header senza dipendere dalla maiuscolatura o dal tipo."""
    getter = getattr(headers, "get", None)
    if not callable(getter):
        return ""
    value = getter(name)
    if value is None:
        value = getter(name.lower())
    return str(value or "").strip()


def _retry_after_seconds(headers: Any) -> float | None:
    """Secondi indicati da ``Retry-After`` (numero o data HTTP), entro un tetto."""
    raw = _header(headers, "Retry-After")
    if not raw:
        return None
    try:
        seconds = float(raw)
    except ValueError:
        try:
            moment = parsedate_to_datetime(raw)
        except (TypeError, ValueError):
            return None
        if moment.tzinfo is None:
            moment = moment.replace(tzinfo=timezone.utc)
        seconds = (moment - datetime.now(timezone.utc)).total_seconds()
    return max(0.0, min(seconds, MAX_RETRY_AFTER_SECONDS))


class DidupError(Exception):
    def __init__(
        self,
        code: str,
        retryable: bool = False,
        http_status: int | None = None,
        endpoint: str | None = None,
        diagnostic_details: str = "",
    ):
        super().__init__(code)
        self.code = code
        self.retryable = retryable
        self.http_status = http_status
        safe_endpoint = (endpoint or "").split("?", 1)[0]
        self.endpoint = re.sub(r"[^A-Za-z0-9_/-]", "", safe_endpoint)[:80]
        self.diagnostic_details = diagnostic_details

    @property
    def diagnostic(self) -> str:
        if self.http_status is None:
            return ""
        endpoint = f" sull’endpoint /{self.endpoint}" if self.endpoint else " nell’API DidUP"
        details = f" ({self.diagnostic_details})" if self.diagnostic_details else ""
        return f"HTTP {self.http_status}{endpoint}{details}"


def _safe_header_value(headers: Any, *names: str) -> str:
    for name in names:
        value = _header(headers, name)
        if value:
            return re.sub(r"[^A-Za-z0-9._:-]", "", value)[:80]
    return ""


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
        self.access_token_expires_at = 0
        self.api_version = "1.29.2"
        self.api_base = API_BASE
        self.api_mode = "legacy"
        self.profile_pk = ""
        self.profile_login: dict[str, Any] = {}
        self.attachment_history_diagnostic = ""
        self.attachment_history_retryable = False

    def _api(self, method: str, path: str, *, payload: dict[str, Any] | None = None,
             include_profile: bool = True):
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": USER_AGENT,
            "argo-client-version": self.api_version,
        }
        if self.api_mode == "web":
            headers["os-type"] = "WEB"
        if self.access_token:
            headers["Authorization"] = "Bearer " + self.access_token
            if self.access_token_expires_at and self.api_mode != "web":
                expires = datetime.fromtimestamp(self.access_token_expires_at)
                headers["x-date-exp-auth"] = (
                    expires.strftime("%Y-%m-%d %H:%M:%S.")
                    + f"{expires.microsecond // 1000:03d}"
                )
        if include_profile and self.profile_login:
            token = self.profile_login.get("token")
            cod_min = self.profile_login.get("codMin") or self.profile_login.get("cod_min")
            if token:
                headers["x-auth-token"] = str(token)
            if cod_min:
                headers["x-cod-min"] = str(cod_min)
        data = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8") if payload is not None else None
        url = urllib.parse.urljoin(self.api_base, path)
        for attempt in range(1, MAX_TRANSIENT_ATTEMPTS + 1):
            try:
                status, response_headers, body = _request(
                    self.opener, method, url, data=data, headers=headers, timeout=60
                )
            except Exception:
                raise DidupError("didup_network", retryable=True)
            if status in (401, 403):
                raise DidupError("didup_credentials_rejected", http_status=status, endpoint=path)
            if status == 429 or status >= 500:
                if attempt < MAX_TRANSIENT_ATTEMPTS:
                    delay = _retry_after_seconds(response_headers)
                    if delay is None:
                        delay = TRANSIENT_RETRY_DELAYS[
                            min(attempt - 1, len(TRANSIENT_RETRY_DELAYS) - 1)
                        ]
                    time.sleep(delay)
                    continue
                # Diagnostica limitata a metadati non segreti: mai registrare token,
                # credenziali, body o valori di header di autenticazione.
                server = _safe_header_value(response_headers, "Server")
                request_id = _safe_header_value(
                    response_headers, "X-Request-Id", "Request-Id", "X-Correlation-Id"
                )
                details = [f"client {self.api_version}", f"api {self.api_mode}"]
                if self.api_mode == "web":
                    details.append("os-type WEB")
                else:
                    details.append(
                        "header scadenza OAuth presente"
                        if "x-date-exp-auth" in {key.lower() for key in headers}
                        else "header scadenza OAuth assente"
                    )
                if server:
                    details.append(f"server {server}")
                if request_id:
                    details.append(f"id richiesta {request_id}")
                raise DidupError(
                    "didup_temporarily_unavailable",
                    retryable=True,
                    http_status=status,
                    endpoint=path,
                    diagnostic_details="; ".join(details),
                )
            if status < 200 or status >= 300:
                raise DidupError("didup_api_error", http_status=status, endpoint=path)
            break
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
        token_data = self._oauth_login()
        self.access_token = token_data["access_token"]
        self.access_token_expires_at = int(token_data.get("expires_at") or 0)
        self.api_version = token_data.get("version") or "1.29.2"
        legacy_version = self.api_version
        self.api_base = WEB_API_BASE
        self.api_mode = "web"
        self.api_version = WEB_API_VERSION
        try:
            # La Famiglia WEB attuale usa questo host, POST /login vuoto,
            # os-type=WEB e la propria versione client.
            response = self._api("POST", "login", payload={}, include_profile=False)
        except DidupError as web_error:
            # Mantieni compatibilità con il vecchio servizio mobile se il token
            # OAuth non è accettato dal backend web o la rotta non è disponibile.
            self.api_base = API_BASE
            self.api_mode = "legacy"
            self.api_version = legacy_version
            try:
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
            except DidupError as legacy_error:
                if web_error.http_status is not None:
                    extra = f"tentativo API web HTTP {web_error.http_status}"
                    legacy_error.diagnostic_details = "; ".join(
                        part for part in (legacy_error.diagnostic_details, extra) if part
                    )
                raise
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
                "opzioni": (
                    None
                    if self.api_mode == "web"
                    else json.dumps(option_map, ensure_ascii=False, separators=(",", ":"))
                ),
            },
        )
        dashboard = _extract_dashboard(dashboard_response)
        profile = self._profile()
        dashboard = self._enrich_bacheca_attachments(dashboard)
        return dashboard, profile

    def _enrich_bacheca_attachments(self, dashboard: dict[str, Any]) -> dict[str, Any]:
        """Fetch bacheca history when the dashboard omits its attachment details."""
        notices = _get(dashboard, "bacheca", default=[])
        if not isinstance(notices, list) or not notices or not self.profile_pk:
            return dashboard
        if all(
            isinstance(item, dict)
            and isinstance(_get(item, "lista_allegati"), list)
            and bool(_get(item, "lista_allegati"))
            for item in notices
        ):
            return dashboard

        path = "famiglia/storicobacheca" if self.api_mode == "web" else "storicobacheca"
        try:
            response = self._api("POST", path, payload={"pkScheda": self.profile_pk})
        except DidupError as error:
            self.attachment_history_diagnostic = error.diagnostic or error.code
            self.attachment_history_retryable = error.retryable
            return dashboard

        data = _get(response, "data", default=response)
        history = _get(data, "bacheca")
        if not isinstance(history, list) and isinstance(data, list):
            history = data
        if not isinstance(history, list) and isinstance(data, dict):
            records = _get(data, "dati", default=[])
            if isinstance(records, list):
                history = next(
                    (candidate for record in records
                     if isinstance(record, dict)
                     and isinstance((candidate := _get(record, "bacheca")), list)),
                    None,
                )
        if not isinstance(history, list):
            self.attachment_history_diagnostic = "storico bacheca: risposta in formato inatteso"
            self.attachment_history_retryable = True
            return dashboard
        if not history:
            return dashboard

        merged = [dict(item) for item in notices if isinstance(item, dict)]
        index_by_pk = {
            str(_get(item, "pk")): index
            for index, item in enumerate(merged)
            if _get(item, "pk") not in (None, "")
        }
        for item in history:
            if not isinstance(item, dict):
                continue
            pk = _get(item, "pk")
            operation = str(_get(item, "operazione", default="")).upper()
            if pk in (None, ""):
                if operation != "D":
                    merged.append({key: value for key, value in item.items() if key != "operazione"})
                continue
            key = str(pk)
            existing_index = index_by_pk.get(key)
            if operation == "D":
                if existing_index is not None:
                    merged[existing_index] = {}
                    index_by_pk.pop(key, None)
                continue
            clean_item = {field: value for field, value in item.items() if field != "operazione"}
            if existing_index is None:
                index_by_pk[key] = len(merged)
                merged.append(clean_item)
            else:
                merged[existing_index].update(clean_item)

        dashboard["bacheca"] = [item for item in merged if item]
        return dashboard

    def _oauth_login(self) -> dict[str, Any]:
        """Login OAuth con un breve backoff sui soli errori transitori del server."""
        for attempt in range(1, MAX_TRANSIENT_ATTEMPTS + 1):
            try:
                return oauth_login(self.school_code, self.username, self.password)
            except AuthError as error:
                transient = error.status == 429 or (
                    error.status is not None and error.status >= 500
                )
                if not transient or attempt >= MAX_TRANSIENT_ATTEMPTS:
                    raise
                time.sleep(
                    TRANSIENT_RETRY_DELAYS[min(attempt - 1, len(TRANSIENT_RETRY_DELAYS) - 1)]
                )
        raise AssertionError("unreachable")

    def _profile(self) -> dict[str, Any]:
        try:
            response = self._api("GET", "profilo")
            data = response.get("data", {}) if isinstance(response, dict) else {}
            if not isinstance(data, dict):
                return {}
            web_profile = data.get("profilo")
            if self.api_mode == "web" and isinstance(web_profile, dict):
                scheda = web_profile.get("scheda")
                self.profile_pk = str(_get(scheda, "pk", default="") or "")
                student = data.get("alunno") or web_profile
            else:
                student = data.get("alunno", {})
            return student if isinstance(student, dict) else {}
        except DidupError:
            return {}

    def download_attachment(self, uid: str, filename: str) -> dict[str, Any]:
        """Fetch a fresh official attachment URL and validate a PDF or DOCX file."""
        if not uid or len(uid) > 256:
            raise DidupError("didup_attachment_unavailable", retryable=True)
        if self.api_mode == "web":
            # Questi allegati arrivano dalla bacheca generale. pkScheda è previsto
            # dal route distinto downloadallegatobachecaalunno, non da questo.
            path = "famiglia/downloadallegatobacheca"
            payload = {"uid": uid}
        else:
            path = "downloadallegatobacheca"
            payload = {"uid": uid}
        response = self._api("POST", path, payload=payload)
        # OpenAPI Famiglia dichiara questa risposta come stringa (URL); alcune
        # versioni del servizio la restituiscono invece dentro un oggetto.
        raw_url = response.strip() if isinstance(response, str) else None
        if not raw_url and isinstance(response, dict):
            raw_url = response.get("url")
        if not raw_url and isinstance(response, dict):
            raw_data = response.get("data")
            if isinstance(raw_data, str):
                raw_url = raw_data.strip()
            elif isinstance(raw_data, dict):
                raw_url = raw_data.get("url")
        if not isinstance(raw_url, str) or not raw_url.strip():
            raise DidupError("didup_attachment_unavailable", retryable=True)
        return self.download_attachment_url(raw_url, filename)

    def download_attachment_url(self, raw_url: str, filename: str) -> dict[str, Any]:
        """Download an already-issued Argo/S3 URL without persisting its signed query."""
        if not isinstance(raw_url, str) or not raw_url.strip() or len(raw_url) > 8192:
            raise DidupError("didup_attachment_unavailable", retryable=True)
        url = urllib.parse.urljoin(self.api_base, raw_url.strip())
        parsed = urllib.parse.urlparse(url)
        host = (parsed.hostname or "").casefold()
        allowed = (
            parsed.scheme == "https"
            and (host == "portaleargo.it" or host.endswith(".portaleargo.it")
                 or host == "amazonaws.com" or host.endswith(".amazonaws.com"))
            and not parsed.username and not parsed.password
            and parsed.port in (None, 443)
        )
        if not allowed:
            raise DidupError("didup_attachment_unavailable", retryable=True)

        # Il sito apre l'URL temporaneo dal contesto Famiglia; alcuni storage
        # Argo rifiutano il download se Origin/Referer non corrispondono al client.
        # Non inoltrare token né query firmate nei log.
        if self.api_mode == "web":
            origin = "https://didattica.portaleargo.it"
            referer = origin + "/famiglia/"
        else:
            origin = "https://www.portaleargo.it"
            referer = origin + "/appfamiglia/"
        request = urllib.request.Request(url, headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,*/*",
            "Origin": origin,
            "Referer": referer,
        })
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
        except urllib.error.HTTPError as error:
            # Registra solo status, host e un codice XML AWS allowlisted; mai URL,
            # query firmate, messaggi S3 o identificativi potenzialmente sensibili.
            retryable = error.code in (403, 404, 410, 429) or error.code >= 500
            s3_code = ""
            if host == "amazonaws.com" or host.endswith(".amazonaws.com"):
                try:
                    body = error.read(8192).decode("utf-8", errors="ignore")
                    match = re.search(r"<Code>\s*([A-Za-z0-9]{1,64})\s*</Code>", body)
                    candidate = match.group(1) if match else ""
                    if candidate in {
                        "AccessDenied", "ExpiredToken", "RequestExpired",
                        "SignatureDoesNotMatch", "InvalidAccessKeyId",
                        "AuthorizationQueryParametersError", "RequestTimeTooSkewed",
                        "NoSuchKey", "PermanentRedirect", "InvalidToken",
                    }:
                        s3_code = candidate
                except Exception:
                    pass
            details = f"host {host}"
            if s3_code:
                details += f"; S3 {s3_code}"
            raise DidupError(
                "didup_attachment_unavailable",
                retryable=retryable,
                http_status=error.code,
                endpoint="download-allegato",
                diagnostic_details=details,
            ) from None
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
