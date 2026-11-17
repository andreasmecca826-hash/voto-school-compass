import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

PYTHON_DIR = Path(__file__).resolve().parents[1] / "app" / "src" / "main" / "python"
sys.path.insert(0, str(PYTHON_DIR))

import didup_sync
from didup_auth import AuthError, _validate_oauth_state
from didup_client import DidupError


class FakeDidupClient:
    def __init__(self, behavior="ok"):
        self.behavior = behavior
        self.download_calls = 0

    def download_attachment(self, _uid, _filename):
        self.download_calls += 1
        if self.behavior == "temporary":
            raise DidupError("didup_temporarily_unavailable", retryable=True)
        if self.behavior == "permanent":
            raise DidupError("didup_attachment_invalid", retryable=False)
        return {"content": b"%PDF-fake", "mime": "application/pdf", "sha256": "a" * 64}


class DidupSyncTests(unittest.TestCase):
    def test_oauth_state_must_be_present_and_match(self):
        _validate_oauth_state("expected", "expected")
        for returned in (None, "", "different"):
            with self.subTest(returned=returned), self.assertRaises(AuthError):
                _validate_oauth_state(returned, "expected")

    def test_refresh_503_is_retryable_but_invalid_refresh_is_terminal(self):
        session = {"refresh_token": "fake-refresh-token"}
        with patch("didup_sync._request", return_value=(503, {}, b"")):
            refreshed, error = didup_sync._refresh_session("https://example.supabase.co", "public-key", session)
        self.assertIsNone(refreshed)
        self.assertEqual(error, "supabase_unavailable")

        with patch("didup_sync._request", return_value=(400, {}, b"invalid refresh token")):
            refreshed, error = didup_sync._refresh_session("https://example.supabase.co", "public-key", session)
        self.assertIsNone(refreshed)
        self.assertEqual(error, "supabase_invalid_session")

    def test_temporary_attachment_failure_requests_workmanager_retry(self):
        client = FakeDidupClient("temporary")
        snapshot = {
            "notifications": [
                {"attachments": [{"name": "avviso.pdf", "sourceUid": "argo-1"}]}
            ]
        }
        result, _session, issue = didup_sync._mirror_attachments(
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
        _result, _session, issue = didup_sync._mirror_attachments(
            client, snapshot, "https://example.supabase.co", "public-key", {"access_token": "token"}
        )
        self.assertEqual(issue, "attachment_issue")
        status = json.loads(didup_sync._result(issue, synced_at="2026-11-17T00:00:00Z"))
        self.assertTrue(status["ok"])
        self.assertFalse(status["retry"])

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
            result, _session, issue = didup_sync._mirror_attachments(
                client, snapshot, "https://example.supabase.co", "public-key", {"access_token": "token"}
            )
        self.assertEqual(client.download_calls, 5)
        self.assertEqual(issue, "attachment_pending")
        self.assertEqual(result["notifications"][0]["attachments"][5]["sourceUid"], "argo-5")


if __name__ == "__main__":
    unittest.main()
