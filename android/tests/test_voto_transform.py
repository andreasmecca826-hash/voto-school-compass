import sys
import unittest
from pathlib import Path

PYTHON_DIR = Path(__file__).resolve().parents[1] / "app" / "src" / "main" / "python"
sys.path.insert(0, str(PYTHON_DIR))

from voto_transform import SnapshotError, build_payload


class VotoTransformTests(unittest.TestCase):
    def dashboard(self):
        return {
            "voti": [
                {
                    "prg_voto": 42,
                    "des_materia": "Matematica",
                    "cod_codice": "7+",
                    "dat_giorno": "2026-11-16",
                }
            ],
            "registro": [
                {
                    "dat_giorno": "2026-11-16",
                    "materia": "Matematica",
                    "attivita": "Equazioni",
                    "compiti": [
                        {
                            "prg": 10,
                            "compito": "Studiare il capitolo 3",
                            "data_consegna": "2026-11-20",
                        }
                    ],
                }
            ],
            "appello": [
                {"prg_evento": 5, "cod_evento": "A", "dat_evento": "2026-11-03", "da_giustificare": "S"},
                {"prg_evento": 6, "cod_evento": "I", "dat_evento": "2026-11-04"},
            ],
            "bacheca": [
                {
                    "prg_messaggio": 7,
                    "dat_giorno": "2026-11-10",
                    "oggetto": "Circolare",
                    "des_messaggio": "Comunicazione scuola",
                    "lista_allegati": [
                        {
                            "uid": "argo-file-abc",
                            "nome_file": "avviso.pdf",
                            "url": "https://bucket.s3.amazonaws.com/file.pdf?X-Amz-Signature=temporary",
                        }
                    ],
                }
            ],
            "promemoria": [],
            "note_disciplinari": [],
        }

    def test_builds_voto_schema_and_safe_attachment_uid(self):
        snapshot = build_payload(self.dashboard(), {"nominativo": "Studente", "classe": "2A", "anno_scolastico": "2026/2027"})
        grade = snapshot["subjects"][0]["grades"][0]
        self.assertEqual(grade["value"], 7.15)
        self.assertEqual(grade["date"], "2026-11-16")
        self.assertEqual(snapshot["assignments"][0]["title"], "Studiare il capitolo 3")
        self.assertEqual(snapshot["attendance"]["absenceDays"], 1)
        notice = next(item for item in snapshot["notifications"] if item["type"] == "notice")
        self.assertEqual(notice["attachments"][0]["sourceUid"], "argo-file-abc")
        self.assertNotIn("url", notice["attachments"][0])

    def test_keeps_old_notice_when_it_has_a_pdf_attachment(self):
        dashboard = self.dashboard()
        dashboard["bacheca"][0]["dat_giorno"] = "2020-10-10"

        snapshot = build_payload(dashboard, {"anno_scolastico": "2026/2027"})

        notice = next(item for item in snapshot["notifications"] if item["type"] == "notice")
        self.assertEqual(notice["date"], "2020-10-10")
        self.assertEqual(notice["attachments"][0]["sourceUid"], "argo-file-abc")

    def test_keeps_old_notice_with_previously_archived_attachment_if_current_list_is_missing(self):
        dashboard = self.dashboard()
        dashboard["bacheca"][0]["dat_giorno"] = "2020-10-10"
        dashboard["bacheca"][0].pop("lista_allegati")
        old_path = "circulars/" + "a" * 64 + ".pdf"
        previous = {
            "notifications": [
                {
                    "id": "prg_messaggio:7",
                    "type": "notice",
                    "attachments": [{"name": "avviso.pdf", "path": old_path}],
                }
            ]
        }

        snapshot = build_payload(dashboard, {"anno_scolastico": "2026/2027"}, previous)

        notice = next(item for item in snapshot["notifications"] if item["type"] == "notice")
        self.assertEqual(notice["attachments"][0]["path"], old_path)

    def test_still_omits_old_notice_without_attachments(self):
        dashboard = self.dashboard()
        dashboard["bacheca"][0]["dat_giorno"] = "2020-10-10"
        dashboard["bacheca"][0].pop("lista_allegati")

        snapshot = build_payload(dashboard, {"anno_scolastico": "2026/2027"})

        self.assertFalse(any(item["type"] == "notice" for item in snapshot["notifications"]))

    def test_uses_current_signed_url_transiently_when_uid_is_missing(self):
        dashboard = self.dashboard()
        attachment = dashboard["bacheca"][0]["lista_allegati"][0]
        attachment.pop("uid")
        previous = {
            "student": {"schoolYear": "2026/2027"},
            "subjects": [{"name": "Matematica", "grades": [{"id": "42", "value": 7}]}],
            "notifications": [
                {
                    "id": "prg_messaggio:7",
                    "type": "notice",
                    "title": "Circolare",
                    "attachments": [
                        {
                            "name": "avviso.pdf",
                            "path": "circulars/" + "a" * 64 + ".pdf",
                            "sourceUid": "old-argo-uid",
                        }
                    ],
                }
            ],
        }
        snapshot = build_payload(dashboard, {"anno_scolastico": "2026/2027"}, previous)
        notice = next(item for item in snapshot["notifications"] if item["type"] == "notice")
        current = notice["attachments"][0]

        self.assertNotIn("path", current)
        self.assertNotIn("sourceUid", current)
        self.assertNotIn("url", current)
        self.assertEqual(
            current["_sourceDownloadUrl"],
            "https://bucket.s3.amazonaws.com/file.pdf?X-Amz-Signature=temporary",
        )

    def test_keeps_previous_circular_path_if_current_attachment_is_missing(self):
        old_path = "circulars/" + "a" * 64 + ".pdf"
        previous = {
            "student": {"schoolYear": "2026/2027"},
            "subjects": [{"name": "Matematica", "grades": [{"id": "42", "value": 7}]}],
            "notifications": [
                {
                    "id": "prg_messaggio:7",
                    "type": "notice",
                    "title": "Circolare",
                    "attachments": [{"name": "avviso.pdf", "path": old_path}],
                }
            ],
        }
        dashboard = self.dashboard()
        dashboard["bacheca"][0].pop("lista_allegati")
        snapshot = build_payload(dashboard, {"anno_scolastico": "2026/2027"}, previous)
        notice = next(item for item in snapshot["notifications"] if item["type"] == "notice")
        self.assertEqual(notice["attachments"][0]["path"], old_path)

    def test_keeps_unmirrored_attachment_uid_for_retry(self):
        previous = {
            "student": {"schoolYear": "2026/2027"},
            "subjects": [{"name": "Matematica", "grades": [{"id": "42", "value": 7}]}],
            "notifications": [
                {
                    "id": "prg_messaggio:7",
                    "type": "notice",
                    "title": "Circolare",
                    "attachments": [{"name": "avviso.pdf", "sourceUid": "argo-file-abc"}],
                }
            ],
        }
        dashboard = self.dashboard()
        dashboard["bacheca"][0].pop("lista_allegati")
        snapshot = build_payload(dashboard, {"anno_scolastico": "2026/2027"}, previous)
        notice = next(item for item in snapshot["notifications"] if item["type"] == "notice")
        self.assertEqual(notice["attachments"][0]["sourceUid"], "argo-file-abc")

    def test_does_not_reuse_old_path_when_same_name_has_new_didup_uid(self):
        old_path = "circulars/" + "b" * 64 + ".pdf"
        previous = {
            "student": {"schoolYear": "2026/2027"},
            "subjects": [{"name": "Matematica", "grades": [{"id": "42", "value": 7}]}],
            "notifications": [
                {
                    "id": "prg_messaggio:7",
                    "type": "notice",
                    "title": "Circolare",
                    "attachments": [
                        {"name": "avviso.pdf", "path": old_path, "sourceUid": "old-argo-uid"}
                    ],
                }
            ],
        }
        snapshot = build_payload(
            self.dashboard(), {"anno_scolastico": "2026/2027"}, previous
        )
        notice = next(item for item in snapshot["notifications"] if item["type"] == "notice")
        self.assertEqual(len(notice["attachments"]), 1)
        self.assertEqual(notice["attachments"][0]["sourceUid"], "argo-file-abc")
        self.assertNotIn("path", notice["attachments"][0])

    def test_rejects_snapshot_missing_previously_populated_section(self):
        previous = {
            "student": {"schoolYear": "2026/2027"},
            "subjects": [{"name": "Matematica", "grades": [{"id": "42", "value": 7}]}],
            "notifications": [{"id": "notice-1", "type": "notice"}],
        }
        dashboard = self.dashboard()
        dashboard.pop("bacheca")
        with self.assertRaises(SnapshotError):
            build_payload(dashboard, {"anno_scolastico": "2026/2027"}, previous)


if __name__ == "__main__":
    unittest.main()
