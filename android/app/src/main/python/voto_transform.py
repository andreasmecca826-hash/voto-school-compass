"""Transform DidUP dashboard responses into the private VOTO snapshot schema."""
from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from datetime import date, datetime, timedelta, timezone
from typing import Any


class SnapshotError(Exception):
    pass


def _camel(name: str) -> str:
    parts = name.split("_")
    return parts[0] + "".join(part[:1].upper() + part[1:] for part in parts[1:])


def get(value: Any, *names: str, default: Any = None) -> Any:
    if not isinstance(value, dict):
        return default
    for name in names:
        for candidate in (name, _camel(name)):
            if candidate in value and value[candidate] not in (None, ""):
                return value[candidate]
    return default


def text(value: Any, *names: str, default: str = "") -> str:
    result = get(value, *names, default=default)
    if result is None or isinstance(result, (dict, list, tuple)):
        return default
    return str(result).strip()


def has_field(value: dict[str, Any], name: str) -> bool:
    return name in value or _camel(name) in value


def _date(value: str) -> date | None:
    value = value.strip()
    if not value:
        return None
    for fmt in ("%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%d/%m/%Y"):
        try:
            return datetime.strptime(value[:len(datetime.now().strftime(fmt))], fmt).date()
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
    except ValueError:
        return None


def _iso_date(value: str) -> str:
    parsed = _date(value)
    return parsed.isoformat() if parsed else value.strip()


def _slug(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value.lower())
    normalized = "".join(char for char in normalized if unicodedata.category(char) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", normalized).strip("-") or "materia"


def _item_key(value: Any, fields: tuple[str, ...]) -> str:
    if not isinstance(value, dict):
        return "h:" + hashlib.sha1(str(value).encode("utf-8")).hexdigest()[:16]
    for field in fields:
        candidate = get(value, field)
        if candidate not in (None, ""):
            return f"{field}:{candidate}"
    stable = {
        key: item for key, item in value.items()
        if item is not None and not isinstance(item, bool)
        and not any(hint in key.lower() for hint in ("visione", "letto", "letta", "conferma", "read"))
    }
    raw = json.dumps(stable, sort_keys=True, ensure_ascii=False, default=str)
    return "h:" + hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]


def _grade_number(value: Any) -> float | None:
    if value in (None, ""):
        return None
    raw = str(value).strip().replace("½", ",5").replace(",", ".")
    signed = re.fullmatch(r"(\d+(?:\.\d+)?)\s*([+-])", raw)
    if signed:
        number = float(signed.group(1)) + (0.15 if signed.group(2) == "+" else -0.15)
        return number if 0 <= number <= 10 else None
    ratio = re.fullmatch(r"(\d+(?:\.\d+)?)\s*/\s*(\d+(?:\.\d+)?)", raw)
    try:
        number = (float(ratio.group(1)) + float(ratio.group(2))) / 2 if ratio else float(raw)
    except (ValueError, AttributeError):
        found = re.search(r"\d+(?:\.\d+)?", raw)
        if not found:
            return None
        number = float(found.group(0))
    return number if 0 <= number <= 10 else None


def _grade_kind(item: Any) -> str:
    code = text(item, "cod_voto_pratico", "tipo_valutazione", "cod_tipo").lower()
    if code.startswith("s") or "scrit" in code:
        return "scritto"
    if code.startswith("n") or "oral" in code:
        return "orale"
    if "prat" in code or "lab" in code:
        return "pratico"
    return "altro"


def _recent_assignment(value: str) -> bool:
    if not value:
        return True
    parsed = _date(value)
    return parsed is None or parsed >= datetime.now(timezone.utc).date() - timedelta(days=1)


def _safe_url(value: str) -> str | None:
    value = value.strip()
    if not value:
        return None
    try:
        from urllib.parse import urlparse, parse_qs
        parsed = urlparse(value)
        if parsed.scheme != "https" or not parsed.hostname:
            return None
        query = {key.casefold() for key in parse_qs(parsed.query)}
        if any(key.startswith("x-amz-") or key in {"signature", "sig", "token"} for key in query):
            return None
        return value
    except Exception:
        return None


def _student_profile(profile: dict[str, Any] | None) -> dict[str, str]:
    data = profile if isinstance(profile, dict) else {}
    name = text(data, "nominativo", "nome_completo", "nomeCompleto")
    if not name:
        name = " ".join(part for part in (text(data, "nome"), text(data, "cognome")) if part).strip()
    year = text(data, "anno_scolastico", "anno", "school_year")
    if not year:
        now = datetime.now(timezone.utc)
        start = now.year if now.month >= 9 else now.year - 1
        year = f"{start}/{start + 1}"
    return {
        "name": name,
        "className": text(data, "classe", "des_classe", "classe_descrizione", "descrizione_classe"),
        "schoolYear": year,
    }


def _build_subjects(votes: list[Any], previous: dict[str, Any], updated_at: str) -> list[dict[str, Any]]:
    old_created: dict[str, str] = {}
    for subject in previous.get("subjects", []) if isinstance(previous.get("subjects"), list) else []:
        if not isinstance(subject, dict):
            continue
        for grade in subject.get("grades", []) if isinstance(subject.get("grades"), list) else []:
            if isinstance(grade, dict) and grade.get("id") and grade.get("createdAt"):
                old_created[str(grade["id"])] = str(grade["createdAt"])

    groups: dict[str, dict[str, Any]] = {}
    new_grade_index = 0
    for index, vote in enumerate(votes):
        subject_name = text(vote, "des_materia", "materia", default="Materia") or "Materia"
        subject_id = _slug(subject_name) or f"materia-{index}"
        subject = groups.setdefault(subject_id, {"id": subject_id, "name": subject_name, "grades": []})
        raw_label = text(vote, "cod_codice", "dec_valore", "valore", "voto")
        numeric = None
        for field in ("dec_valore", "cod_codice", "valore", "voto"):
            numeric = _grade_number(get(vote, field))
            if numeric is not None:
                break
        if numeric is None:
            continue
        grade_id = text(vote, "prg_voto") or _item_key(vote, ("prg_voto",))
        grade_date = text(vote, "dat_evento", "dat_giorno")
        created_at = old_created.get(grade_id) or text(vote, "created_at", "data_inserimento", "dat_inserimento")
        if not created_at:
            try:
                base = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
            except ValueError:
                base = datetime.now(timezone.utc)
            created_at = (base + timedelta(microseconds=new_grade_index)).isoformat(timespec="microseconds").replace("+00:00", "Z")
            new_grade_index += 1
        subject["grades"].append({
            "id": grade_id,
            "value": numeric,
            "label": raw_label or str(numeric),
            "date": _iso_date(grade_date),
            "type": _grade_kind(vote),
            "weight": 1,
            "comment": text(vote, "des_commento", "commento") or None,
            "teacher": text(vote, "docente", "des_docente") or None,
            "createdAt": created_at,
        })
    return list(groups.values())


def _build_assignments(lessons: list[Any]) -> list[dict[str, Any]]:
    result = []
    seen: set[str] = set()
    for lesson_index, lesson in enumerate(lessons):
        if not isinstance(lesson, dict):
            continue
        lesson_date = text(lesson, "dat_giorno", "dat_evento", "data")
        subject = text(lesson, "materia", "des_materia")
        teacher = text(lesson, "docente", "des_docente")
        tasks = get(lesson, "compiti", default=[])
        if not isinstance(tasks, list):
            continue
        for task_index, task in enumerate(tasks):
            if not isinstance(task, dict):
                continue
            title = text(task, "compito", "des_compito", "des_compiti")
            if not title:
                continue
            due_date = text(task, "data_consegna", "dat_compiti", "dat_consegna", "data")
            if not _recent_assignment(due_date):
                continue
            key = _item_key(task, ("prg", "id"))
            if key in seen:
                continue
            seen.add(key)
            assigned = text(task, "dat_assegnazione", "data_assegnazione", "dat_inserimento", "data_inserimento") or lesson_date
            result.append({
                "id": key or f"compito-{lesson_index}-{task_index}",
                "title": title,
                "subject": text(task, "des_materia", "materia") or subject or None,
                "dueDate": _iso_date(due_date) if due_date else None,
                "assignedDate": _iso_date(assigned) if assigned else None,
                "teacher": text(task, "docente", "des_docente", "insegnante", "professore", "prof") or teacher or None,
                "completed": False,
                "details": text(task, "descrizione", "dettagli") or None,
            })
    return result


def _build_diary(lessons: list[Any]) -> list[dict[str, Any]]:
    result = []
    for index, lesson in enumerate(lessons):
        if not isinstance(lesson, dict):
            continue
        activity = text(lesson, "attivita", "des_attivita", "descrizione")
        if not activity:
            continue
        date_value = text(lesson, "dat_giorno", "dat_evento", "data")
        result.append({
            "id": _item_key(lesson, ("pk_lezione", "pk_materia", "dat_evento", "dat_giorno", "ora", "attivita")) or f"diario-{index}",
            "date": _iso_date(date_value) if date_value else "",
            "subject": text(lesson, "des_materia", "materia") or None,
            "teacher": text(lesson, "docente", "des_docente") or None,
            "hour": text(lesson, "ora", "ora_lezione") or None,
            "activity": activity,
        })
    return result


def _build_attendance(events: list[Any]) -> tuple[list[dict[str, Any]], dict[str, int]]:
    counts = {"A": 0, "I": 0, "U": 0}
    type_map = {"A": "absence", "I": "delay", "U": "earlyExit"}
    result = []
    for index, event in enumerate(events):
        if not isinstance(event, dict):
            continue
        code = text(event, "cod_evento").upper()
        if code not in counts:
            continue
        counts[code] += 1
        raw_date = text(event, "dat_evento", "data")
        parsed = _date(raw_date)
        if not parsed:
            continue
        pending_raw = get(event, "da_giustificare")
        pending = pending_raw is True or str(pending_raw or "").strip().upper() in {"S", "SI", "TRUE", "1"}
        justified = text(event, "giustificata").upper() == "S"
        status = "Da giustificare" if code == "A" and pending else "Giustificata" if code == "A" and justified else None
        result.append({
            "id": text(event, "prg_evento", "id") or f"appello-{code}-{parsed.isoformat()}-{index}",
            "type": type_map[code],
            "date": parsed.isoformat(),
            **({"justificationStatus": status} if status else {}),
        })
    attendance = {
        "absenceDays": counts["A"],
        "absenceHours": counts["A"] * 6,
        "delays": counts["I"],
        "earlyExits": counts["U"],
        "annualHours": 990,
        "absenceLimitHours": 264,
    }
    return result, attendance


def _notification_key(item: dict[str, Any], kind: str, index: int) -> str:
    fields = ("prg_promemoria", "prg_promemoria_alunno", "prg", "id") if kind == "reminder" else ("prg_messaggio", "prg_bacheca", "prg", "id")
    return _item_key(item, fields) or f"{kind}-{index}"


def _previous_notifications(previous: dict[str, Any]) -> dict[str, dict[str, Any]]:
    items = previous.get("notifications", [])
    return {str(item.get("id")): item for item in items if isinstance(item, dict) and item.get("id") is not None} if isinstance(items, list) else {}


def _merge_attachments(current: list[dict[str, Any]], previous: Any) -> list[dict[str, Any]]:
    old = previous if isinstance(previous, list) else []
    merged: list[dict[str, Any]] = []
    used_old: set[int] = set()
    for item in current:
        name = str(item.get("name") or "").casefold()
        current_uid = str(item.get("sourceUid") or "")
        match_index = next((i for i, old_item in enumerate(old)
                            if i not in used_old and isinstance(old_item, dict)
                            and (old_item.get("name") or "").casefold() == name
                            and old_item.get("path")
                            and (not current_uid or not old_item.get("sourceUid")
                                 or str(old_item.get("sourceUid")) == current_uid)
                            and (not current_uid or bool(old_item.get("sourceUid")))), None)
        if match_index is not None:
            used_old.add(match_index)
            preserved = dict(old[match_index])
            preserved["name"] = item.get("name") or preserved.get("name")
            merged.append(preserved)
        else:
            merged.append(item)
    for i, old_item in enumerate(old):
        if i in used_old or not isinstance(old_item, dict):
            continue
        path = old_item.get("path")
        if isinstance(path, str) and re.fullmatch(r"circulars/[a-f0-9]{64}\.(?:pdf|docx)", path, re.I):
            name = str(old_item.get("name") or "").casefold()
            current = next((entry for entry in merged if str(entry.get("name") or "").casefold() == name), None)
            if current is None:
                merged.append(dict(old_item))
            continue
        source_uid = old_item.get("sourceUid")
        if isinstance(source_uid, str) and source_uid:
            name = str(old_item.get("name") or "").casefold()
            current = next((entry for entry in merged if str(entry.get("name") or "").casefold() == name), None)
            if current is not None:
                if not current.get("sourceUid"):
                    current["sourceUid"] = source_uid
            else:
                merged.append(dict(old_item))
    unique: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in merged:
        identity = str(item.get("path") or item.get("url") or item.get("sourceUid") or item.get("name") or "")
        if identity and identity not in seen:
            seen.add(identity)
            unique.append(item)
    return unique


def _build_notifications(dashboard: dict[str, Any], previous: dict[str, Any]) -> list[dict[str, Any]]:
    old_by_id = _previous_notifications(previous)
    notifications: list[dict[str, Any]] = []
    sections = (
        ("note_disciplinari", "note", "Nota disciplinare"),
        ("bacheca", "notice", "Comunicazione"),
        ("promemoria", "reminder", "Promemoria"),
    )
    found_types: set[str] = set()
    for section, kind, default_title in sections:
        raw_items = get(dashboard, section, default=[])
        if raw_items is None:
            continue
        if not isinstance(raw_items, list):
            raise SnapshotError("incomplete_dashboard")
        found_types.add(kind)
        for index, item in enumerate(raw_items):
            if not isinstance(item, dict):
                continue
            title_names = ("des_oggetto", "oggetto", "titolo", "des_titolo")
            if kind == "reminder":
                title_names = ("des_oggetto", "des_titolo", "oggetto", "titolo", "des_tipo")
            message_names = (
                ("descrizione", "des_descrizione", "des_annotazioni", "nota", "des_nota", "des_messaggio", "messaggio", "testo", "des_testo")
                if kind == "note" else
                ("des_annotazioni", "des_promemoria", "des_testo", "testo", "messaggio", "annotazioni", "descrizione")
                if kind == "reminder" else
                ("des_messaggio", "messaggio", "testo", "des_testo", "nota", "descrizione")
            )
            date_names = ("dat_giorno", "dat_promemoria", "dat_evento", "data") if kind == "reminder" else ("dat_giorno", "dat_evento", "data")
            event_date = text(item, *date_names)
            parsed = _date(event_date)
            if kind == "notice" and parsed and parsed < datetime.now(timezone.utc).date() - timedelta(days=365):
                continue
            title = text(item, *title_names, default=default_title) or default_title
            message = text(item, *message_names)
            if kind == "note" and not message:
                candidates = [str(value).strip() for key, value in item.items()
                              if isinstance(value, str) and value.strip()
                              and any(token in key.casefold() for token in ("descr", "nota", "testo", "messag", "annot"))]
                message = max(candidates, key=len, default="")
            item_id = _notification_key(item, kind, index)
            prior = old_by_id.get(item_id, {})
            raw_attachments = get(item, "lista_allegati", default=[])
            entries: list[dict[str, Any]] = []
            if isinstance(raw_attachments, list):
                parent_url = text(item, "url", "des_url")
                for attachment in raw_attachments:
                    if not isinstance(attachment, dict):
                        continue
                    name = text(attachment, "nome_file", "descrizione_file", default="allegato") or "allegato"
                    path = text(attachment, "path")
                    url = text(attachment, "url")
                    if path and not path.startswith("http"):
                        url = f"{(url or parent_url).rstrip('/')}/{path.lstrip('/')}" if (url or parent_url) else path
                    else:
                        url = path or url or parent_url
                    safe_url = _safe_url(url)
                    entry = {"name": name, **({"url": safe_url} if safe_url else {})}
                    source_uid = text(attachment, "uid", "pk")
                    if source_uid:
                        entry["sourceUid"] = source_uid
                    entries.append(entry)
            attachments = _merge_attachments(entries, prior.get("attachments"))
            internal = next((entry for entry in attachments if entry.get("path")), None)
            external = next((entry for entry in attachments if entry.get("url")), None)
            extracted_parts = [entry.get("extractedText") for entry in attachments
                               if isinstance(entry.get("extractedText"), str) and entry["extractedText"].strip()]
            notification = {
                "id": item_id,
                "type": kind,
                "title": title,
                "message": message or None,
                "date": _iso_date(event_date) if event_date else None,
                "subject": text(item, "categoria", "category", "des_categoria", "des_materia", "materia") or None,
                "teacher": text(item, "docente", "des_docente", "insegnante", "professore", "prof") or None,
                "read": prior.get("read") is True,
                "attachmentPath": internal.get("path") if internal else None,
                "attachmentUrl": external.get("url") if external and not internal else None,
                "attachmentName": (attachments[0].get("name") if attachments else text(item, "nome_file", "file_name")) or None,
            }
            if attachments:
                notification["attachments"] = attachments
            if extracted_parts:
                notification["extractedText"] = "\n\n".join(extracted_parts)[:30000]
            if prior.get("hasTables") is True:
                notification["hasTables"] = True
                if isinstance(prior.get("tableCount"), int):
                    notification["tableCount"] = prior["tableCount"]
            if prior.get("extractionMethod") in ("pdf-text", "ocr", "docx", "text", "unavailable"):
                notification["extractionMethod"] = prior["extractionMethod"]
            if prior.get("extractionQuality") in ("high", "medium", "low"):
                notification["extractionQuality"] = prior["extractionQuality"]
            notifications.append(notification)

    # Una sezione assente non viene interpretata come vuota: mantieni gli elementi
    # precedenti di quel tipo, esattamente come faceva il monitor per i dati non risposti.
    kind_by_section = {"note_disciplinari": "note", "bacheca": "notice", "promemoria": "reminder"}
    previous_items = previous.get("notifications", [])
    if isinstance(previous_items, list):
        active_ids = {str(item.get("id")) for item in notifications if isinstance(item, dict)}
        for section, kind in kind_by_section.items():
            if has_field(dashboard, section):
                continue
            for item in previous_items:
                if isinstance(item, dict) and item.get("type") == kind and str(item.get("id")) not in active_ids:
                    notifications.append(dict(item))
    return notifications


def build_payload(dashboard: dict[str, Any], profile: dict[str, Any] | None,
                  previous: dict[str, Any] | None = None) -> dict[str, Any]:
    if not isinstance(dashboard, dict):
        raise SnapshotError("incomplete_dashboard")
    previous = previous if isinstance(previous, dict) else {}
    if not has_field(dashboard, "voti") or not isinstance(get(dashboard, "voti"), list):
        raise SnapshotError("incomplete_dashboard")
    # La dashboard valida espone gli array anche quando sono vuoti. Se una sezione
    # già popolata manca nella nuova risposta, non pubblicare uno snapshot parziale.
    previous_sections = {
        "registro": bool(previous.get("assignments") or previous.get("diary")),
        "appello": bool(previous.get("attendanceEvents") or any((previous.get("attendance") or {}).get(key, 0) for key in ("absenceDays", "delays", "earlyExits"))),
        "bacheca": any(item.get("type") == "notice" for item in previous.get("notifications", []) if isinstance(item, dict)),
        "promemoria": any(item.get("type") == "reminder" for item in previous.get("notifications", []) if isinstance(item, dict)),
        "note_disciplinari": any(item.get("type") == "note" for item in previous.get("notifications", []) if isinstance(item, dict)),
    }
    for section, has_previous in previous_sections.items():
        if has_previous and not has_field(dashboard, section):
            raise SnapshotError("incomplete_dashboard")

    lessons = get(dashboard, "registro", default=[])
    events = get(dashboard, "appello", default=[])
    if not isinstance(lessons, list) or not isinstance(events, list):
        raise SnapshotError("incomplete_dashboard")
    updated_at = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    student = _student_profile(profile)
    previous_student = previous.get("student", {}) if isinstance(previous.get("student"), dict) else {}
    old_year = str(previous_student.get("schoolYear") or "")
    if old_year and student["schoolYear"] and old_year != student["schoolYear"]:
        previous = {}

    subjects = _build_subjects(get(dashboard, "voti", default=[]), previous, updated_at)
    old_grade_count = sum(len(sub.get("grades", [])) for sub in previous.get("subjects", []) if isinstance(sub, dict) and isinstance(sub.get("grades"), list))
    new_grade_count = sum(len(sub.get("grades", [])) for sub in subjects)
    if old_grade_count > 0 and new_grade_count == 0:
        raise SnapshotError("empty_grades_rejected")

    attendance_events, attendance = _build_attendance(events)
    return {
        "student": student,
        "updatedAt": updated_at,
        "subjects": subjects,
        "assignments": _build_assignments(lessons),
        "notifications": _build_notifications(dashboard, previous),
        "diary": _build_diary(lessons),
        "attendance": attendance,
        "attendanceEvents": attendance_events,
    }
