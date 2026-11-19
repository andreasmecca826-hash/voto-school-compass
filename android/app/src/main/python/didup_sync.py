"""One-shot DidUP -> private Supabase sync, invoked by Android WorkManager."""
from __future__ import annotations

import json
import re
import time
import urllib.parse
from datetime import datetime, timezone
from typing import Any

from didup_auth import AuthError, _opener, _request
from didup_client import DidupClient, DidupError
from voto_transform import SnapshotError, build_payload

MAX_ATTACHMENT_FILES_PER_SYNC = 5
MAX_ATTACHMENT_BYTES_PER_SYNC = 50 * 1024 * 1024


_MESSAGES = {
    "ok": "Sincronizzazione completata.",
    "didup_credentials_rejected": "Credenziali DidUP non valide. Controlla codice scuola, utente e password.",
    "didup_profile_disabled": "Il profilo DidUP selezionato risulta disabilitato.",
    "didup_profile_missing": "DidUP non ha restituito un profilo studente utilizzabile.",
    "didup_temporarily_unavailable": "DidUP ha risposto con un errore temporaneo; riproverò automaticamente.",
    "didup_network": "Connessione a DidUP non riuscita; riproverò quando la rete sarà disponibile.",
    "didup_api_error": "DidUP ha rifiutato temporaneamente la richiesta.",
    "didup_response_invalid": "DidUP ha restituito una risposta non leggibile.",
    "incomplete_dashboard": "DidUP non ha restituito tutti i dati necessari. Lo snapshot precedente è stato mantenuto.",
    "empty_grades_rejected": "DidUP non ha restituito voti; per sicurezza lo snapshot precedente è stato mantenuto.",
    "session_required": "Apri VOTO e accedi per autorizzare la sincronizzazione sicura.",
    "access_denied": "L’account VOTO corrente non è autorizzato a pubblicare i dati scolastici.",
    "supabase_unavailable": "Il servizio dati VOTO non è disponibile; riproverò più tardi.",
    "supabase_invalid_session": "La sessione VOTO è scaduta. Apri di nuovo l’app per aggiornarla.",
    "supabase_configuration": "La configurazione sicura del servizio non è disponibile.",
    "attachment_retry": "Dati scolastici aggiornati; alcuni allegati sono temporaneamente in attesa. Riproverò automaticamente.",
    "attachment_pending": "Dati scolastici aggiornati; sto completando gli allegati a lotti. Il prossimo lotto partirà automaticamente.",
    "attachment_issue": "Dati scolastici aggiornati, ma un allegato non è stato archiviato. Verificalo direttamente in DidUP.",
    "sync_error": "Sincronizzazione non riuscita. Riproverò quando le condizioni lo consentiranno.",
}


def _record_ids(items: Any) -> set[str]:
    if not isinstance(items, list):
        return set()
    return {
        str(item["id"])
        for item in items
        if isinstance(item, dict) and item.get("id") not in (None, "")
    }


def _grade_ids(snapshot: dict[str, Any]) -> set[str]:
    subjects = snapshot.get("subjects")
    if not isinstance(subjects, list):
        return set()
    return {
        str(grade["id"])
        for subject in subjects
        if isinstance(subject, dict) and isinstance(subject.get("grades"), list)
        for grade in subject["grades"]
        if isinstance(grade, dict) and grade.get("id") not in (None, "")
    }


_UPDATE_CATEGORY_ORDER = (
    "voti", "note", "promemoria", "assenze", "ritardi", "uscite",
    "compiti", "circolari", "comunicazioni", "diario",
)


def _notification_update_category(item: Any) -> str | None:
    if not isinstance(item, dict):
        return None
    kind = item.get("type")
    if kind == "note":
        return "note"
    if kind == "reminder":
        return "promemoria"
    if kind != "notice":
        return None

    hints = [item.get(field) for field in ("title", "subject", "attachmentName")]
    attachments = item.get("attachments")
    if isinstance(attachments, list):
        hints.extend(
            attachment.get("name")
            for attachment in attachments
            if isinstance(attachment, dict)
        )
    if any("circol" in str(value).casefold() for value in hints if value):
        return "circolari"
    return "comunicazioni"


def _new_update_categories(previous: dict[str, Any], current: dict[str, Any]) -> list[str]:
    """Return safe category labels for newly appearing records after the baseline sync."""
    if not previous.get("updatedAt"):
        return []
    old_student = previous.get("student") if isinstance(previous.get("student"), dict) else {}
    new_student = current.get("student") if isinstance(current.get("student"), dict) else {}
    old_year = str(old_student.get("schoolYear") or "")
    new_year = str(new_student.get("schoolYear") or "")
    if old_year and new_year and old_year != new_year:
        return []

    found: set[str] = set()
    if _grade_ids(current) - _grade_ids(previous):
        found.add("voti")

    new_notification_ids = _record_ids(current.get("notifications")) - _record_ids(previous.get("notifications"))
    current_notifications = current.get("notifications")
    if isinstance(current_notifications, list):
        for item in current_notifications:
            if isinstance(item, dict) and str(item.get("id", "")) in new_notification_ids:
                category = _notification_update_category(item)
                if category:
                    found.add(category)

    if _record_ids(current.get("assignments")) - _record_ids(previous.get("assignments")):
        found.add("compiti")

    attendance_categories = {
        "absence": "assenze",
        "delay": "ritardi",
        "earlyExit": "uscite",
    }
    new_attendance_ids = _record_ids(current.get("attendanceEvents")) - _record_ids(previous.get("attendanceEvents"))
    current_events = current.get("attendanceEvents")
    if isinstance(current_events, list):
        for event in current_events:
            if isinstance(event, dict) and str(event.get("id", "")) in new_attendance_ids:
                category = attendance_categories.get(str(event.get("type", "")))
                if category:
                    found.add(category)

    if _record_ids(current.get("diary")) - _record_ids(previous.get("diary")):
        found.add("diario")

    return [category for category in _UPDATE_CATEGORY_ORDER if category in found]


def _result(
    code: str,
    *,
    retry: bool = False,
    session: dict[str, Any] | None = None,
    synced_at: str | None = None,
    diagnostic: str | None = None,
    update_categories: list[str] | None = None,
) -> str:
    categories = list(dict.fromkeys(
        category for category in (update_categories or []) if category in _UPDATE_CATEGORY_ORDER
    ))
    body: dict[str, Any] = {
        "ok": code in ("ok", "attachment_retry", "attachment_pending", "attachment_issue"),
        "code": code,
        "message": (
            _MESSAGES.get(code, _MESSAGES["sync_error"])
            + (f" Dettaglio tecnico: {diagnostic}." if diagnostic else "")
        ),
        "retry": retry,
        "updatesFound": bool(categories),
        "updateCategories": categories,
    }
    if synced_at:
        body["syncedAt"] = synced_at
    if session:
        body["accessToken"] = session.get("access_token", "")
        body["refreshToken"] = session.get("refresh_token", "")
        body["expiresAt"] = int(session.get("expires_at") or 0)
        body["sessionUpdated"] = bool(session.get("_refreshed"))
    return json.dumps(body, ensure_ascii=False, separators=(",", ":"))


def _valid_supabase_url(value: str) -> bool:
    try:
        parsed = urllib.parse.urlparse(value)
        return parsed.scheme == "https" and bool(parsed.hostname) and not parsed.username and not parsed.password
    except Exception:
        return False


def _auth_headers(api_key: str, access_token: str) -> dict[str, str]:
    return {
        "apikey": api_key,
        "Authorization": "Bearer " + access_token,
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "VOTO-Android-Sync/1.0",
    }


def _http_diagnostic(stage: str, status: int | None = None, error: Exception | None = None) -> str:
    """Expose operation/status or exception type only, never bodies or credentials."""
    if status is not None:
        return f"{stage}: HTTP {status}"
    if error is not None:
        return f"{stage}: rete ({type(error).__name__})"
    return stage


def _refresh_session(
    base_url: str, api_key: str, session: dict[str, Any]
) -> tuple[dict[str, Any] | None, str | None]:
    refresh_token = str(session.get("refresh_token") or "")
    if not refresh_token:
        session["_diagnostic"] = "refresh sessione: refresh token assente"
        return None, "supabase_invalid_session"
    url = base_url.rstrip("/") + "/auth/v1/token?grant_type=refresh_token"
    payload = json.dumps({"refresh_token": refresh_token}, separators=(",", ":")).encode("utf-8")
    try:
        status, _, body = _request(
            _opener(redirects=True), "POST", url, data=payload,
            headers={"apikey": api_key, "Content-Type": "application/json", "Accept": "application/json"}, timeout=20,
        )
        if status == 400 and _refresh_token_was_rotated(body):
            # Un altro worker/app può aver ruotato il token nello stesso
            # istante. Al prossimo tentativo il vault verrà riletto; non è
            # una prova che l’account abbia perso la sessione.
            session["_diagnostic"] = _http_diagnostic("refresh sessione", status)
            return None, "supabase_unavailable"
        if status in (400, 401, 403):
            session["_diagnostic"] = _http_diagnostic("refresh sessione", status)
            return None, "supabase_invalid_session"
        if status == 429 or status >= 500:
            session["_diagnostic"] = _http_diagnostic("refresh sessione", status)
            return None, "supabase_unavailable"
        if status < 200 or status >= 300:
            session["_diagnostic"] = _http_diagnostic("refresh sessione", status)
            return None, "supabase_configuration"
        data = json.loads(body.decode("utf-8"))
        if not isinstance(data, dict) or not data.get("access_token"):
            session["_diagnostic"] = "refresh sessione: risposta senza token"
            return None, "supabase_unavailable"
        expires_at = data.get("expires_at")
        if not expires_at:
            expires_at = int(time.time() + float(data.get("expires_in") or 3600))
        return ({
            "access_token": str(data["access_token"]),
            "refresh_token": str(data.get("refresh_token") or refresh_token),
            "expires_at": int(expires_at),
            "_refreshed": True,
        }, None)
    except Exception as error:
        session["_diagnostic"] = _http_diagnostic("refresh sessione", error=error)
        return None, "supabase_unavailable"


def _refresh_token_was_rotated(body: bytes) -> bool:
    try:
        data = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return False
    return isinstance(data, dict) and data.get("error_code") == "refresh_token_already_used"


def _get_previous(base_url: str, api_key: str, session: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    url = base_url.rstrip("/") + "/functions/v1/school-data"
    status = 0
    body = b""
    last_error: Exception | None = None
    for attempt, delay in enumerate((0, 1, 3)):
        if delay:
            time.sleep(delay)
        try:
            status, _, body = _request(
                _opener(redirects=True), "GET", url,
                headers=_auth_headers(api_key, session["access_token"]), timeout=30,
            )
            last_error = None
        except Exception as error:
            last_error = error
            if attempt < 2:
                continue
        if last_error is not None:
            if attempt < 2:
                continue
            break
        if status == 503:
            try:
                initial_error = str(json.loads(body.decode("utf-8")).get("error", "")).casefold()
            except Exception:
                initial_error = ""
            if "non ancora disponibili" in initial_error:
                break
        if status == 429 or status >= 500:
            if attempt < 2:
                continue
        break
    if last_error is not None:
        return {}, {
            "error": "supabase_unavailable",
            "diagnostic": _http_diagnostic("lettura dati VOTO", error=last_error),
        }
    if status == 200:
        try:
            payload = json.loads(body.decode("utf-8"))
            return (payload if isinstance(payload, dict) else {}), {}
        except (UnicodeDecodeError, json.JSONDecodeError):
            return {}, {"error": "supabase_unavailable", "diagnostic": "lettura dati VOTO: risposta JSON non valida"}
    if status == 503:
        try:
            message = json.loads(body.decode("utf-8")).get("error", "")
        except Exception:
            message = ""
        if "non ancora disponibili" in str(message).casefold():
            return {}, {}
        return {}, {"error": "supabase_unavailable", "diagnostic": _http_diagnostic("lettura dati VOTO", status)}
    if status == 401:
        return {}, {"error": "supabase_invalid_session", "diagnostic": _http_diagnostic("lettura dati VOTO", status)}
    if status == 403:
        return {}, {"error": "access_denied", "diagnostic": _http_diagnostic("lettura dati VOTO", status)}
    if status >= 500:
        return {}, {"error": "supabase_unavailable", "diagnostic": _http_diagnostic("lettura dati VOTO", status)}
    return {}, {"error": "supabase_unavailable", "diagnostic": _http_diagnostic("lettura dati VOTO", status)}


def _upload(base_url: str, api_key: str, session: dict[str, Any], payload: dict[str, Any]) -> str | None:
    url = base_url.rstrip("/") + "/functions/v1/sync-school-data"
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    try:
        status, _, response = _request(
            _opener(redirects=True), "POST", url, data=body,
            headers=_auth_headers(api_key, session["access_token"]), timeout=45,
        )
    except Exception as error:
        session["_diagnostic"] = _http_diagnostic("scrittura dati VOTO", error=error)
        return "supabase_unavailable"
    if 200 <= status < 300:
        return None
    session["_diagnostic"] = _http_diagnostic("scrittura dati VOTO", status)
    if status == 401:
        return "supabase_invalid_session"
    if status == 403:
        return "access_denied"
    if status == 429 or status >= 500:
        return "supabase_unavailable"
    return "supabase_unavailable"


def _upload_attachment(base_url: str, api_key: str, session: dict[str, Any],
                       attachment: dict[str, Any]) -> tuple[str | None, str | None]:
    url = base_url.rstrip("/") + "/functions/v1/sync-school-attachment"
    content = attachment.get("content")
    if not isinstance(content, bytes) or not content:
        return None, "supabase_unavailable"
    headers = _auth_headers(api_key, session["access_token"])
    headers["Content-Type"] = str(attachment.get("mime") or "application/octet-stream")
    headers["x-file-sha256"] = str(attachment.get("sha256") or "")
    try:
        status, _, body = _request(
            _opener(redirects=True), "POST", url, data=content,
            headers=headers, timeout=60,
        )
    except Exception as error:
        session["_diagnostic"] = _http_diagnostic("upload allegato", error=error)
        return None, "supabase_unavailable"
    if status == 401:
        session["_diagnostic"] = _http_diagnostic("upload allegato", status)
        return None, "supabase_invalid_session"
    if status == 403:
        session["_diagnostic"] = _http_diagnostic("upload allegato", status)
        return None, "access_denied"
    if status < 200 or status >= 300:
        session["_diagnostic"] = _http_diagnostic("upload allegato", status)
        return None, "supabase_unavailable"
    try:
        result = json.loads(body.decode("utf-8"))
    except Exception:
        session["_diagnostic"] = "upload allegato: risposta JSON non valida"
        return None, "supabase_unavailable"
    path = result.get("path") if isinstance(result, dict) else None
    if not isinstance(path, str) or not re.fullmatch(r"circulars/[a-f0-9]{64}\.(pdf|docx)", path):
        session["_diagnostic"] = "upload allegato: path risposta non valido"
        return None, "supabase_unavailable"
    return path, None


def _mirror_attachments(client: DidupClient, snapshot: dict[str, Any], base_url: str,
                        api_key: str, session: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any], str | None, str | None]:
    uploaded_by_uid: dict[str, str] = {}
    attempted_files = 0
    uploaded_bytes = 0
    retryable_issue = False
    permanent_issue = False
    queued_issue = False
    attachment_diagnostic: str | None = None
    notices = snapshot.get("notifications")
    if not isinstance(notices, list):
        return snapshot, session, None, None
    for notice in notices:
        if not isinstance(notice, dict):
            continue
        attachments = notice.get("attachments")
        if not isinstance(attachments, list):
            continue
        for attachment in attachments:
            if not isinstance(attachment, dict):
                continue
            uid = str(attachment.get("sourceUid") or "")
            source_url = str(attachment.get("_sourceDownloadUrl") or "")
            if attachment.get("path") and not source_url:
                continue
            if not uid and not source_url:
                permanent_issue = True
                attachment_diagnostic = attachment_diagnostic or "UID allegato e URL sorgente assenti"
                continue
            if uid in uploaded_by_uid:
                attachment["path"] = uploaded_by_uid[uid]
                attachment.pop("url", None)
                continue
            if attempted_files >= MAX_ATTACHMENT_FILES_PER_SYNC:
                queued_issue = True
                continue
            attempted_files += 1
            filename = str(attachment.get("name") or "allegato.pdf")
            try:
                if uid:
                    try:
                        downloaded = client.download_attachment(uid, filename)
                    except DidupError as primary_error:
                        if not source_url:
                            raise
                        try:
                            downloaded = client.download_attachment_url(source_url, filename)
                        except DidupError as fallback_error:
                            if primary_error.retryable or fallback_error.retryable:
                                retryable_issue = True
                            else:
                                permanent_issue = True
                            attachment_diagnostic = (
                                attachment_diagnostic
                                or fallback_error.diagnostic
                                or primary_error.diagnostic
                                or fallback_error.code
                            )
                            continue
                else:
                    downloaded = client.download_attachment_url(source_url, filename)
            except DidupError as error:
                if error.retryable:
                    retryable_issue = True
                else:
                    permanent_issue = True
                attachment_diagnostic = attachment_diagnostic or error.diagnostic or error.code
                continue
            file_size = len(downloaded.get("content", b""))
            if uploaded_bytes + file_size > MAX_ATTACHMENT_BYTES_PER_SYNC:
                queued_issue = True
                continue
            path, error = _upload_attachment(base_url, api_key, session, downloaded)
            if error == "supabase_invalid_session":
                refreshed, refresh_error = _refresh_session(base_url, api_key, session)
                if refreshed:
                    session = refreshed
                    path, error = _upload_attachment(base_url, api_key, session, downloaded)
                elif refresh_error == "supabase_unavailable":
                    retryable_issue = True
                else:
                    permanent_issue = True
            if path:
                uploaded_bytes += file_size
                uploaded_by_uid[uid] = path
                attachment["path"] = path
                attachment.pop("url", None)
            elif error == "supabase_unavailable":
                retryable_issue = True
                attachment_diagnostic = attachment_diagnostic or session.get("_diagnostic") or "upload allegato: servizio non disponibile"
            elif error:
                permanent_issue = True
                attachment_diagnostic = attachment_diagnostic or f"archiviazione Supabase: {error}"

        # I link firmati valgono solo per questo tentativo: non vanno salvati nello snapshot.
        for attachment in attachments:
            if isinstance(attachment, dict):
                attachment.pop("_sourceDownloadUrl", None)
        internal = next((item for item in attachments if isinstance(item, dict) and item.get("path")), None)
        external = next((item for item in attachments if isinstance(item, dict) and item.get("url")), None)
        notice["attachmentPath"] = internal.get("path") if internal else None
        notice["attachmentUrl"] = external.get("url") if external and not internal else None
        if attachments:
            notice["attachmentName"] = attachments[0].get("name") or notice.get("attachmentName")
    issue = (
        "attachment_retry" if retryable_issue else
        "attachment_issue" if permanent_issue else
        "attachment_pending" if queued_issue else
        None
    )
    return snapshot, session, issue, attachment_diagnostic


def sync(input_json: str) -> str:
    """Receives JSON from Java, performs one bounded sync, returns safe JSON."""
    try:
        data = json.loads(input_json)
        if not isinstance(data, dict):
            return _result("sync_error")
        school_code = str(data.get("schoolCode") or "").strip()
        username = str(data.get("username") or "").strip()
        password = str(data.get("password") or "")
        base_url = str(data.get("supabaseUrl") or "").rstrip("/")
        api_key = str(data.get("publishableKey") or "")
        access_token = str(data.get("supabaseAccessToken") or "")
        refresh_token = str(data.get("supabaseRefreshToken") or "")
        try:
            expires_at = int(data.get("supabaseExpiresAt") or 0)
        except (TypeError, ValueError):
            expires_at = 0
        session = {"access_token": access_token, "refresh_token": refresh_token, "expires_at": expires_at}
        if not (school_code and username and password and base_url and api_key):
            return _result("sync_error")
        if not _valid_supabase_url(base_url):
            return _result("supabase_configuration")
        if not access_token or not refresh_token:
            return _result("session_required")
        if expires_at and expires_at <= int(time.time()) + 90:
            refreshed, refresh_error = _refresh_session(base_url, api_key, session)
            if not refreshed:
                code = refresh_error or "supabase_invalid_session"
                return _result(code, retry=code == "supabase_unavailable", session=session, diagnostic=session.get("_diagnostic"))
            session = refreshed

        previous, previous_error = _get_previous(base_url, api_key, session)
        if previous_error.get("error") == "supabase_invalid_session":
            refreshed, refresh_error = _refresh_session(base_url, api_key, session)
            if not refreshed:
                code = refresh_error or "supabase_invalid_session"
                return _result(code, retry=code == "supabase_unavailable", session=session, diagnostic=session.get("_diagnostic"))
            session = refreshed
            previous, previous_error = _get_previous(base_url, api_key, session)
        if previous_error:
            return _result(
                previous_error["error"],
                retry=previous_error["error"] == "supabase_unavailable",
                session=session,
                diagnostic=previous_error.get("diagnostic") or session.get("_diagnostic"),
            )

        client = DidupClient(school_code, username, password)
        try:
            dashboard, profile = client.login()
        except AuthError as error:
            if error.status == 429 or (error.status is not None and error.status >= 500):
                code = "didup_temporarily_unavailable"
                diagnostic = f"HTTP {error.status} durante il login OAuth Argo"
            elif error.code == "didup_credentials_rejected":
                code = error.code
                diagnostic = (
                    f"HTTP {error.status} durante il login Argo"
                    if error.status and error.status >= 400
                    else None
                )
            else:
                code = (
                    "didup_network"
                    if error.code in ("argo_auth_start", "argo_login_challenge")
                    else error.code
                )
                diagnostic = (
                    f"HTTP {error.status} durante il login OAuth Argo"
                    if error.status and error.status >= 400
                    else None
                )
            return _result(
                code,
                retry=code in ("didup_network", "didup_temporarily_unavailable"),
                session=session,
                diagnostic=diagnostic,
            )
        except DidupError as error:
            return _result(
                error.code,
                retry=error.retryable,
                session=session,
                diagnostic=error.diagnostic or None,
            )
        try:
            snapshot = build_payload(dashboard, profile, previous)
        except SnapshotError as error:
            code = str(error) if str(error) in _MESSAGES else "incomplete_dashboard"
            return _result(code, session=session)
        update_categories = _new_update_categories(previous, snapshot)
        snapshot, session, attachment_issue, attachment_diagnostic = _mirror_attachments(
            client, snapshot, base_url, api_key, session
        )
        history_diagnostic = getattr(client, "attachment_history_diagnostic", "")
        if history_diagnostic and not attachment_issue:
            attachment_issue = (
                "attachment_retry"
                if getattr(client, "attachment_history_retryable", False)
                else "attachment_issue"
            )
            attachment_diagnostic = f"lettura dettagli bacheca: {history_diagnostic}"
        upload_error = _upload(base_url, api_key, session, snapshot)
        if upload_error == "supabase_invalid_session":
            refreshed, refresh_error = _refresh_session(base_url, api_key, session)
            if not refreshed:
                code = refresh_error or "supabase_invalid_session"
                return _result(code, retry=code == "supabase_unavailable", session=session, diagnostic=session.get("_diagnostic"))
            session = refreshed
            upload_error = _upload(base_url, api_key, session, snapshot)
        if upload_error:
            return _result(
                upload_error, retry=upload_error == "supabase_unavailable",
                session=session, diagnostic=session.get("_diagnostic"),
            )
        synced_at = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
        code = attachment_issue or "ok"
        return _result(
            code,
            retry=code == "attachment_retry",
            session=session,
            synced_at=synced_at,
            diagnostic=attachment_diagnostic,
            update_categories=update_categories,
        )
    except Exception:
        return _result("sync_error", retry=True)
