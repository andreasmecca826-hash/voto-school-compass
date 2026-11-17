"""Minimal standard-library OAuth2/PKCE client for the Android DidUP worker."""
from __future__ import annotations

import base64
import hashlib
import html
import json
import re
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from html.parser import HTMLParser
from http.cookiejar import CookieJar
from typing import Any

APP_BUNDLE_ID = "it.argosoft.didup.famiglia.new"
APP_LOOKUP_URL = "https://itunes.apple.com/lookup"
OAUTH_AUTH_URL = "https://auth.portaleargo.it/oauth2/auth"
OAUTH_TOKEN_URL = "https://auth.portaleargo.it/oauth2/token"
SSO_LOGIN_URL = "https://www.portaleargo.it/auth/sso/login"
CLIENT_ID = "72fd6dea-d0ab-4bb9-8eaa-3ac24c84886c"
REDIRECT_URI = "it.argosoft.didup.famiglia.new://login-callback"
SCOPES = ("openid", "offline", "profile", "user.roles", "argo")
FALLBACK_VERSION = "1.29.2"
USER_AGENT = (
    "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"
)


class AuthError(Exception):
    def __init__(self, code: str, status: int | None = None):
        super().__init__(code)
        self.code = code
        self.status = status


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def _opener(cookie_jar: CookieJar | None = None, *, redirects: bool = False):
    handlers: list[Any] = []
    if cookie_jar is not None:
        handlers.append(urllib.request.HTTPCookieProcessor(cookie_jar))
    if not redirects:
        handlers.append(_NoRedirect())
    return urllib.request.build_opener(*handlers)


def _request(opener, method: str, url: str, *, data: bytes | None = None,
             headers: dict[str, str] | None = None, timeout: float = 30.0):
    request = urllib.request.Request(url, data=data, headers=headers or {}, method=method)
    try:
        response = opener.open(request, timeout=timeout)
    except urllib.error.HTTPError as error:
        response = error
    status = int(getattr(response, "status", getattr(response, "code", 0)) or 0)
    response_headers = response.headers
    body = response.read()
    return status, response_headers, body


def _json_body(body: bytes, status: int, code: str) -> dict[str, Any]:
    try:
        parsed = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise AuthError(code, status)
    if not isinstance(parsed, dict):
        raise AuthError(code, status)
    return parsed


def _random_string(length: int) -> str:
    alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _pkce_challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    return base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")


def _lookup_app_version() -> str:
    try:
        url = APP_LOOKUP_URL + "?" + urllib.parse.urlencode({"bundleId": APP_BUNDLE_ID})
        status, _, body = _request(_opener(redirects=True), "GET", url,
                                   headers={"User-Agent": USER_AGENT}, timeout=10)
        if status != 200:
            return FALLBACK_VERSION
        payload = json.loads(body.decode("utf-8"))
        results = payload.get("results") or []
        version = results[0].get("version") if results and isinstance(results[0], dict) else None
        return str(version) if version else FALLBACK_VERSION
    except Exception:
        return FALLBACK_VERSION


def _query(url: str, key: str) -> str | None:
    values = urllib.parse.parse_qs(urllib.parse.urlparse(url).query).get(key)
    return values[0] if values else None


def _validate_oauth_state(returned_state: str | None, expected_state: str) -> None:
    if not returned_state or returned_state != expected_state:
        raise AuthError("argo_oauth_state_mismatch")


def _decode_html(value: str) -> str:
    value = html.unescape(value)
    for old, new in (("\\/", "/"), ("\\u0026", "&"), ("\\u003d", "="), ("\\x26", "&")):
        value = value.replace(old, new)
    return value


_NEGATIVE = re.compile(r"rifiut|nega|deny|reject|annull|cancel|indietro", re.I)
_CONTINUE = re.compile(r"continu|prosegui|avanti|accedi all'app|apri", re.I)
_META_URL = re.compile(r"url\s*=\s*['\"]?([^'\";]+)", re.I)
_JS_LOCATION = re.compile(
    r"location(?:\.href)?\s*=\s*['\"`]([^'\"`]+)['\"`]"
    r"|location\.(?:replace|assign)\(\s*['\"`]([^'\"`]+)['\"`]",
    re.I,
)


class _Form:
    def __init__(self, action: str, method: str):
        self.action = action
        self.method = method.upper() or "GET"
        self.fields: list[tuple[str, str]] = []
        self.buttons: list[tuple[str, str, str]] = []
        self.has_password = False


class _PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.text = ""
        self.title = ""
        self.forms: list[_Form] = []
        self.links: list[tuple[str, str]] = []
        self.meta_refresh: str | None = None
        self.form: _Form | None = None
        self.link: tuple[str, list[str]] | None = None
        self.button: tuple[str, str, list[str]] | None = None
        self.in_title = False

    def handle_starttag(self, tag: str, attrs):
        attrs_map = {key.lower(): (value or "") for key, value in attrs}
        present = {key.lower() for key, _ in attrs}
        if tag == "form":
            self.form = _Form(attrs_map.get("action", ""), attrs_map.get("method", "GET"))
            self.forms.append(self.form)
        elif tag == "input" and self.form is not None:
            kind = (attrs_map.get("type") or "text").lower()
            name = attrs_map.get("name", "")
            value = attrs_map.get("value", "")
            if kind == "password":
                self.form.has_password = True
            elif kind in ("submit", "image"):
                self.form.buttons.append((name, value, value))
            elif kind in ("checkbox", "radio"):
                if name and ("checked" in present or "scope" in name.lower()):
                    self.form.fields.append((name, value or "on"))
            elif kind not in ("button", "reset", "file") and name:
                self.form.fields.append((name, value))
        elif tag == "button" and self.form is not None:
            if (attrs_map.get("type") or "submit").lower() == "submit":
                self.button = (attrs_map.get("name", ""), attrs_map.get("value", ""), [])
        elif tag == "a" and attrs_map.get("href"):
            self.link = (attrs_map["href"], [])
        elif tag == "meta" and attrs_map.get("http-equiv", "").lower() == "refresh":
            match = _META_URL.search(attrs_map.get("content", ""))
            if match and self.meta_refresh is None:
                self.meta_refresh = match.group(1).strip()
        elif tag == "title":
            self.in_title = True

    def handle_startendtag(self, tag: str, attrs):
        self.handle_starttag(tag, attrs)
        if tag == "button":
            self.handle_endtag(tag)

    def handle_endtag(self, tag: str):
        if tag == "form":
            self.form = None
        elif tag == "button" and self.button is not None and self.form is not None:
            name, value, text = self.button
            self.form.buttons.append((name, value, " ".join(text).strip()))
            self.button = None
        elif tag == "a" and self.link is not None:
            href, text = self.link
            self.links.append((href, " ".join(text).strip()))
            self.link = None
        elif tag == "title":
            self.in_title = False

    def handle_data(self, data: str):
        if self.in_title:
            self.title = (self.title + " " + data.strip()).strip()
        if self.link is not None:
            self.link[1].append(data.strip())
        if self.button is not None:
            self.button[2].append(data.strip())

    def next_step(self, current_url: str):
        text = _decode_html(self.text)
        callback = re.search(re.escape(REDIRECT_URI) + r"\?[^\s\"'<>\\`]+", text)
        if callback:
            return "GET", callback.group(0), None
        if self.meta_refresh:
            return "GET", urllib.parse.urljoin(current_url, self.meta_refresh), None
        js = _JS_LOCATION.search(text)
        if js:
            target = js.group(1) or js.group(2)
            if target and not target.startswith(("#", "javascript:")):
                return "GET", urllib.parse.urljoin(current_url, target), None

        for form in self.forms:
            if form.has_password:
                continue
            fields = list(form.fields)
            if form.buttons:
                accepted = [button for button in form.buttons
                            if not _NEGATIVE.search(" ".join(button))]
                if not accepted:
                    continue
                name, value, _ = accepted[0]
                if name:
                    fields.append((name, value))
            if not fields and not form.action:
                continue
            action = urllib.parse.urljoin(current_url, form.action or current_url)
            encoded = urllib.parse.urlencode(fields)
            if form.method == "POST":
                return "POST", action, encoded
            parsed = urllib.parse.urlparse(action)
            return "GET", urllib.parse.urlunparse(parsed._replace(query=encoded)), None

        for href, label in self.links:
            if href.startswith(("#", "javascript:", "mailto:", "tel:")):
                continue
            if _CONTINUE.search(label):
                return "GET", urllib.parse.urljoin(current_url, href), None

        challenge = _query(current_url, "consent_challenge")
        if challenge:
            fields = [("challenge", challenge)]
            fields.extend(("grant_scope", scope) for scope in SCOPES)
            fields.append(("consent", "Accetta"))
            base = urllib.parse.urlparse(current_url)
            url = urllib.parse.urlunparse(base._replace(query="", fragment=""))
            return "POST", url, urllib.parse.urlencode(fields)
        return None


def oauth_login(school_code: str, username: str, password: str) -> dict[str, Any]:
    """Runs Argo's OAuth2/PKCE flow and returns only the access-token response."""
    version = _lookup_app_version()
    verifier = _random_string(43)
    state = _random_string(22)
    nonce = _random_string(22)
    params = {
        "redirect_uri": REDIRECT_URI,
        "client_id": CLIENT_ID,
        "response_type": "code",
        "prompt": "login",
        "state": state,
        "nonce": nonce,
        "scope": " ".join(SCOPES),
        "code_challenge": _pkce_challenge(verifier),
        "code_challenge_method": "S256",
    }
    auth_url = OAUTH_AUTH_URL + "?" + urllib.parse.urlencode(params)
    cookies = CookieJar()
    opener = _opener(cookies, redirects=False)
    status, headers, _ = _request(opener, "GET", auth_url,
                                  headers={"User-Agent": USER_AGENT, "Accept": "text/html,*/*"})
    location = headers.get("Location")
    if not location:
        raise AuthError("argo_auth_start", status)
    location = urllib.parse.urljoin(auth_url, location)
    challenge = _query(location, "login_challenge")
    if not challenge:
        raise AuthError("argo_login_challenge")

    form = urllib.parse.urlencode({
        "challenge": challenge,
        "client_id": CLIENT_ID,
        "prefill": "false",
        "famiglia_customer_code": school_code,
        "username": username,
        "password": password,
        "login": "true",
    }).encode("utf-8")
    status, headers, _ = _request(
        opener, "POST", SSO_LOGIN_URL, data=form,
        headers={"User-Agent": USER_AGENT,
                 "Accept": "text/html,*/*",
                 "Content-Type": "application/x-www-form-urlencoded"},
    )
    location = headers.get("Location")
    if not location:
        raise AuthError("didup_credentials_rejected", status)
    current_url = urllib.parse.urljoin(SSO_LOGIN_URL, location)

    method = "GET"
    post_body: bytes | None = None
    for _ in range(15):
        if current_url.startswith(REDIRECT_URI):
            break
        request_headers = {"User-Agent": USER_AGENT, "Accept": "text/html,*/*"}
        if method == "POST":
            request_headers["Content-Type"] = "application/x-www-form-urlencoded"
        status, response_headers, body = _request(
            opener, method, current_url, data=post_body, headers=request_headers
        )
        method, post_body = "GET", None
        next_location = response_headers.get("Location")
        if next_location:
            current_url = urllib.parse.urljoin(current_url, next_location)
            continue
        if status < 200 or status >= 300:
            raise AuthError("argo_oauth_redirect_failed", status)
        parser = _PageParser()
        parser.text = body.decode("utf-8", errors="replace")
        try:
            parser.feed(parser.text)
        except Exception:
            pass
        next_step = parser.next_step(current_url)
        if not next_step:
            raise AuthError("argo_oauth_consent_failed", status)
        method, current_url, form_text = next_step
        if form_text is not None:
            post_body = form_text.encode("utf-8")
    else:
        raise AuthError("argo_oauth_too_many_redirects")

    code = _query(current_url, "code")
    returned_state = _query(current_url, "state")
    if not code:
        error = _query(current_url, "error")
        raise AuthError("argo_oauth_denied" if error else "argo_oauth_code_missing")
    _validate_oauth_state(returned_state, state)

    token_form = urllib.parse.urlencode({
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": REDIRECT_URI,
        "code_verifier": verifier,
        "client_id": CLIENT_ID,
    }).encode("utf-8")
    status, _, body = _request(
        _opener(redirects=True), "POST", OAUTH_TOKEN_URL, data=token_form,
        headers={"User-Agent": USER_AGENT,
                 "Accept": "application/json",
                 "Content-Type": "application/x-www-form-urlencoded"},
        timeout=30,
    )
    token_data = _json_body(body, status, "argo_token_invalid")
    if status >= 400 or token_data.get("error"):
        raise AuthError("argo_token_rejected", status)
    if not isinstance(token_data.get("access_token"), str):
        raise AuthError("argo_token_missing", status)
    expires_in = token_data.get("expires_in")
    try:
        expires_at = int(time.time() + float(expires_in)) if expires_in else 0
    except (TypeError, ValueError):
        expires_at = 0
    return {
        "access_token": token_data["access_token"],
        "expires_at": expires_at,
        "version": version,
    }
