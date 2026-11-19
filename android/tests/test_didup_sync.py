import json
import sys
import urllib.error
import unittest
from pathlib import Path
from unittest.mock import patch

PYTHON_DIR = Path(__file__).resolve().parents[1] / "app" / "src" / "main" / "python"
sys.path.insert(0, str(PYTHON_DIR))

import didup_sync
from didup_auth import AuthError, _validate_oauth_state
from didup_client import DidupClient, DidupError


class FakeDidupClient:
    def __init__(self, behavior="ok"):
        self.behavior = behavior
        self.download_calls = 0
        self.download_url_calls = 0

    def download_attachment(self, _uid, _filename):
        self.download_calls += 1
        if self.behavior == "http403":
            raise DidupError(
                "didup_attachment_unavailable", retryable=True, http_status=403,
                endpoint="download-allegato", diagnostic_details="host bucket.s3.amazonaws.com",
            )
        if self.behavior == "temporary":
            raise DidupError("didup_temporarily_unavailable", retryable=True)
        if self.behavior == "permanent":
            raise DidupError("didup_attachment_invalid", retryable=False)
        return {"content": b"%PDF-fake", "mime": "application/pdf", "sha256": "a" * 64}

    def download_attachment_url(self, _url, _filename):
        self.download_url_calls += 1
        if self.behavior == "http403":
            raise DidupError(
                "didup_attachment_unavailable", retryable=True, http_status=403,
                endpoint="download-allegato", diagnostic_details="host bucket.s3.amazonaws.com",
            )
        if self.behavior == "temporary":
            raise DidupError("didup_temporarily_unavailable", retryable=True)
        if self.behavior == "permanent":
            raise DidupError("didup_attachment_invalid", retryable=False)
        return {"content": b"%PDF-fake", "mime": "application/pdf", "sha256": "a" * 64}


class DidupSyncTests(unittest.TestCase):
    def test_new_update_categories_suppress_initial_sync_and_name_changed_sections(self):
        previous = {
            "updatedAt": "2026-11-01T08:00:00Z",
            "student": {"schoolYear": "2026/2027"},
            "subjects": [{"id": "matematica", "grades": [{"id": "grade-1"}]}],
            "assignments": [{"id": "task-1"}],
            "notifications": [
                {"id": "note-1", "type": "note"},
                {"id": "reminder-1", "type": "reminder"},
                {"id": "notice-1", "type": "notice", "title": "Avviso", "subject": "Comunicazione"},
                {"id": "circular-1", "type": "notice", "title": "Circolare precedente"},
            ],
            "attendanceEvents": [{"id": "event-a", "type": "absence"}],
            "diary": [{"id": "diary-1"}],
        }
        current = {
            "updatedAt": "2026-11-02T08:00:00Z",
            "student": {"schoolYear": "2026/2027"},
            "subjects": [{"id": "matematica", "grades": [{"id": "grade-1"}, {"id": "grade-2"}]}],
            "assignments": [{"id": "task-1"}, {"id": "task-2"}],
            "notifications": [
                {"id": "note-1", "type": "note"},
                {"id": "note-2", "type": "note"},
                {"id": "reminder-1", "type": "reminder"},
                {"id": "reminder-2", "type": "reminder"},
                {"id": "notice-1", "type": "notice", "title": "Avviso", "subject": "Comunicazione"},
                {"id": "notice-2", "type": "notice", "title": "Avviso importante", "subject": "Comunicazione"},
                {"id": "circular-1", "type": "notice", "title": "Circolare precedente"},
                {"id": "circular-2", "type": "notice", "title": "Circolare n. 2"},
            ],
            "attendanceEvents": [
                {"id": "event-a", "type": "absence"},
                {"id": "event-a2", "type": "absence"},
                {"id": "event-i", "type": "delay"},
                {"id": "event-u", "type": "earlyExit"},
            ],
            "diary": [{"id": "diary-1"}, {"id": "diary-2"}],
        }

        self.assertEqual(didup_sync._new_update_categories({}, current), [])
        self.assertEqual(
            didup_sync._new_update_categories(previous, current),
            [
                "voti", "note", "promemoria", "assenze", "ritardi", "uscite",
                "compiti", "circolari", "comunicazioni", "diario",
            ],
        )
        self.assertEqual(didup_sync._new_update_categories(current, current), [])
        self.assertEqual(
            didup_sync._new_update_categories(
                previous,
                {**current, "student": {"schoolYear": "2027/2028"}},
            ),
            [],
        )

    def test_sync_result_exposes_only_safe_update_categories(self):
        result = json.loads(
            didup_sync._result(
                "ok",
                update_categories=["note", "circolari", "note", "voto-id-42"],
            )
        )
        self.assertTrue(result["updatesFound"])
        self.assertEqual(result["updateCategories"], ["note", "circolari"])
        self.assertNotIn("updateCount", result)

    def test_oauth_state_must_be_present_and_match(self):
        _validate_oauth_state("expected", "expected")
        for returned in (None, "", "different"):
            with self.subTest(returned=returned), self.assertRaises(AuthError):
                _validate_oauth_state(returned, "expected")

    def test_didup_http_503_is_reported_without_response_body_or_credentials(self):
        client = DidupClient("school-secret", "user-secret", "password-secret")
        with patch("didup_client._request", return_value=(503, {}, b"private response body")):
            with self.assertRaises(DidupError) as raised:
                client._api("POST", "dashboard/dashboard")

        error = raised.exception
        self.assertEqual(error.code, "didup_temporarily_unavailable")
        self.assertTrue(error.retryable)
        self.assertEqual(error.http_status, 503)
        self.assertEqual(error.endpoint, "dashboard/dashboard")
        message = json.loads(didup_sync._result(error.code, diagnostic=error.diagnostic))["message"]
        self.assertIn("HTTP 503", message)
        self.assertIn("dashboard/dashboard", message)
        self.assertNotIn("private response body", message)
        self.assertNotIn("password-secret", message)

    def test_refresh_503_is_retryable_but_invalid_refresh_is_terminal(self):
        session = {"refresh_token": "fake-refresh-token"}
        with patch("didup_sync._request", return_value=(503, {}, b"")):
            refreshed, error = didup_sync._refresh_session("https://example.supabase.co", "public-key", session)
        self.assertIsNone(refreshed)
        self.assertEqual(error, "supabase_unavailable")
        self.assertEqual(session["_diagnostic"], "refresh sessione: HTTP 503")

        with patch("didup_sync._request", return_value=(400, {}, b"invalid refresh token")):
            refreshed, error = didup_sync._refresh_session("https://example.supabase.co", "public-key", session)
        self.assertIsNone(refreshed)
        self.assertEqual(error, "supabase_invalid_session")
        self.assertEqual(session["_diagnostic"], "refresh sessione: HTTP 400")

    def test_refresh_token_rotation_is_retryable(self):
        session = {"refresh_token": "old-refresh-token"}
        body = b'{"error_code":"refresh_token_already_used"}'
        with patch("didup_sync._request", return_value=(400, {}, body)):
            refreshed, error = didup_sync._refresh_session(
                "https://example.supabase.co", "public-key", session
            )
        self.assertIsNone(refreshed)
        self.assertEqual(error, "supabase_unavailable")
        self.assertEqual(session["_diagnostic"], "refresh sessione: HTTP 400")

    def test_snapshot_read_http_error_reports_stage_and_status_without_body(self):
        session = {"access_token": "access-secret"}
        with patch(
            "didup_sync._request",
            return_value=(503, {}, b'{"error":"internal storage details"}'),
        ), patch("didup_sync.time.sleep"):
            _snapshot, error = didup_sync._get_previous(
                "https://example.supabase.co", "public-key", session
            )

        self.assertEqual(error["error"], "supabase_unavailable")
        self.assertEqual(error["diagnostic"], "lettura dati VOTO: HTTP 503")
        self.assertNotIn("internal storage details", error["diagnostic"])

    def test_snapshot_read_retries_transient_url_error(self):
        session = {"access_token": "access-secret"}
        responses = [
            urllib.error.URLError("temporary offline"),
            (200, {}, b'{"subjects":[]}'),
        ]
        with patch("didup_sync._request", side_effect=responses) as request, patch(
            "didup_sync.time.sleep"
        ):
            snapshot, error = didup_sync._get_previous(
                "https://example.supabase.co", "public-key", session
            )

        self.assertEqual(snapshot, {"subjects": []})
        self.assertEqual(error, {})
        self.assertEqual(request.call_count, 2)

    def test_snapshot_write_http_error_reports_stage_and_status(self):
        session = {"access_token": "access-secret"}
        with patch(
            "didup_sync._request",
            return_value=(503, {}, b"private response body"),
        ):
            error = didup_sync._upload(
                "https://example.supabase.co", "public-key", session, {"student": {}}
            )

        self.assertEqual(error, "supabase_unavailable")
        self.assertEqual(session["_diagnostic"], "scrittura dati VOTO: HTTP 503")
        self.assertNotIn("private response body", session["_diagnostic"])

    def test_temporary_attachment_failure_requests_workmanager_retry(self):
        client = FakeDidupClient("temporary")
        snapshot = {
            "notifications": [
                {"attachments": [{"name": "avviso.pdf", "sourceUid": "argo-1"}]}
            ]
        }
        result, _session, issue, _diagnostic = didup_sync._mirror_attachments(
            client, snapshot, "https://example.supabase.co", "public-key", {"access_token": "token"}
        )
        self.assertEqual(issue, "attachment_retry")
        self.assertEqual(result["notifications"][0]["attachments"][0]["sourceUid"], "argo-1")
        self.assertTrue(json.loads(didup_sync._result(issue, retry=True))["retry"])

    def test_permanent_attachment_error_is_visible_without_fast_retry(self):
        client = FakeDidupClient("permanent")
        snapshot = {
            "notifications": [
                {"attachments": [{"name": "avviso.pdf", "sourceUid": "argo-1"}]}
            ]
        }
        _result, _session, issue, _diagnostic = didup_sync._mirror_attachments(
            client, snapshot, "https://example.supabase.co", "public-key", {"access_token": "token"}
        )
        self.assertEqual(issue, "attachment_issue")
        status = json.loads(didup_sync._result(issue, synced_at="2026-11-17T00:00:00Z"))
        self.assertTrue(status["ok"])
        self.assertFalse(status["retry"])

    def test_mirrors_temporary_url_when_attachment_has_no_uid_and_does_not_persist_it(self):
        signed_url = "https://bucket.s3.amazonaws.com/avviso.pdf?X-Amz-Signature=temporary"
        client = FakeDidupClient()
        snapshot = {
            "notifications": [
                {"attachments": [{"name": "avviso.pdf", "_sourceDownloadUrl": signed_url}]}
            ]
        }
        path = "circulars/" + "d" * 64 + ".pdf"
        with patch("didup_sync._upload_attachment", return_value=(path, None)):
            result, _session, issue, _diagnostic = didup_sync._mirror_attachments(
                client, snapshot, "https://example.supabase.co", "public-key", {"access_token": "token"}
            )

        attachment = result["notifications"][0]["attachments"][0]
        self.assertEqual(issue, None)
        self.assertEqual(client.download_url_calls, 1)
        self.assertEqual(attachment["path"], path)
        self.assertNotIn("_sourceDownloadUrl", attachment)

    def test_attachment_without_uid_or_safe_source_url_is_not_silently_reported_as_success(self):
        client = FakeDidupClient()
        snapshot = {"notifications": [{"attachments": [{"name": "avviso.pdf"}]}]}
        _result, _session, issue, _diagnostic = didup_sync._mirror_attachments(
            client, snapshot, "https://example.supabase.co", "public-key", {"access_token": "token"}
        )
        self.assertEqual(issue, "attachment_issue")
        self.assertEqual(client.download_calls, 0)
        self.assertEqual(client.download_url_calls, 0)

    def test_attachment_http_error_is_visible_without_signed_url(self):
        signed_url = "https://bucket.s3.amazonaws.com/file.pdf?X-Amz-Signature=secret-value"
        client = FakeDidupClient("http403")
        snapshot = {
            "notifications": [
                {
                    "attachments": [
                        {
                            "name": "avviso.pdf",
                            "sourceUid": "argo-1",
                            "_sourceDownloadUrl": signed_url,
                        }
                    ]
                }
            ]
        }
        _result, _session, issue, diagnostic = didup_sync._mirror_attachments(
            client, snapshot, "https://example.supabase.co", "public-key", {"access_token": "token"}
        )
        status = json.loads(didup_sync._result(issue, diagnostic=diagnostic))
        self.assertEqual(issue, "attachment_retry")
        self.assertIn("HTTP 403", diagnostic)
        self.assertIn("bucket.s3.amazonaws.com", status["message"])
        self.assertNotIn("X-Amz-Signature", status["message"])
        self.assertNotIn("secret-value", status["message"])

    def test_attachment_file_cap_leaves_remaining_uid_for_next_period(self):
        client = FakeDidupClient()
        snapshot = {
            "notifications": [
                {
                    "attachments": [
                        {"name": f"avviso-{index}.pdf", "sourceUid": f"argo-{index}"}
                        for index in range(6)
                    ]
                }
            ]
        }
        with patch("didup_sync._upload_attachment", return_value=("circulars/" + "c" * 64 + ".pdf", None)):
            result, _session, issue, _diagnostic = didup_sync._mirror_attachments(
                client, snapshot, "https://example.supabase.co", "public-key", {"access_token": "token"}
            )
        self.assertEqual(client.download_calls, 5)
        self.assertEqual(issue, "attachment_pending")
        self.assertEqual(result["notifications"][0]["attachments"][5]["sourceUid"], "argo-5")


if __name__ == "__main__":
    unittest.main()
