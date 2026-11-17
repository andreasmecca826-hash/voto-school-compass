import sys
import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import patch

PYTHON_DIR = Path(__file__).resolve().parents[1] / "app" / "src" / "main" / "python"
sys.path.insert(0, str(PYTHON_DIR))

from didup_auth import AuthError
from didup_client import DidupClient, DidupError

PROFILES = {"data": [{"token": "profile-token", "codMin": "cod-min", "opzioni": []}]}


class DidupClientRetryTests(unittest.TestCase):
    def client(self) -> DidupClient:
        return DidupClient("SC12345", "utente", "password")

    def test_transient_503_on_login_is_retried_before_failing(self):
        client = self.client()
        responses = [(503, {}, b""), (200, {}, b'{"data": []}')]
        with patch("didup_client._request", side_effect=responses) as request, patch(
            "didup_client.time.sleep"
        ) as sleep:
            result = client._api("POST", "login")

        self.assertEqual(result, {"data": []})
        self.assertEqual(request.call_count, 2)
        self.assertEqual([call.args[0] for call in sleep.call_args_list], [2.0])

    def test_retry_after_header_is_honoured(self):
        client = self.client()
        responses = [(503, {"Retry-After": "7"}, b""), (200, {}, b'{"data": []}')]
        with patch("didup_client._request", side_effect=responses), patch(
            "didup_client.time.sleep"
        ) as sleep:
            client._api("POST", "login")

        self.assertEqual([call.args[0] for call in sleep.call_args_list], [7.0])

    def test_retry_after_is_capped_to_keep_the_worker_bounded(self):
        client = self.client()
        responses = [(429, {"Retry-After": "600"}, b""), (200, {}, b'{"data": []}')]
        with patch("didup_client._request", side_effect=responses), patch(
            "didup_client.time.sleep"
        ) as sleep:
            client._api("POST", "login")

        self.assertEqual([call.args[0] for call in sleep.call_args_list], [30.0])

    def test_api_includes_oauth_expiration_header_when_available(self):
        client = self.client()
        client.access_token = "access-token"
        client.access_token_expires_at = 1_800_000_000
        with patch("didup_client._request", return_value=(200, {}, b'{"data": []}')) as request:
            client._api("POST", "login")

        sent_headers = request.call_args.kwargs["headers"]
        expires = datetime.fromtimestamp(client.access_token_expires_at)
        expected = expires.strftime("%Y-%m-%d %H:%M:%S.") + f"{expires.microsecond // 1000:03d}"
        self.assertEqual(sent_headers["x-date-exp-auth"], expected)

    def test_gives_up_after_three_transient_failures(self):
        client = self.client()
        with patch("didup_client._request", return_value=(503, {}, b"")) as request, patch(
            "didup_client.time.sleep"
        ) as sleep:
            with self.assertRaises(DidupError) as raised:
                client._api("POST", "login")

        error = raised.exception
        self.assertEqual(error.code, "didup_temporarily_unavailable")
        self.assertTrue(error.retryable)
        self.assertEqual(error.http_status, 503)
        self.assertEqual(error.endpoint, "login")
        self.assertEqual(request.call_count, 3)
        self.assertEqual([call.args[0] for call in sleep.call_args_list], [2.0, 8.0])

    def test_credentials_failure_is_not_retried(self):
        client = self.client()
        with patch("didup_client._request", return_value=(401, {}, b"")) as request, patch(
            "didup_client.time.sleep"
        ) as sleep:
            with self.assertRaises(DidupError) as raised:
                client._api("POST", "login")

        self.assertEqual(raised.exception.code, "didup_credentials_rejected")
        self.assertEqual(request.call_count, 1)
        sleep.assert_not_called()

    def test_login_retries_the_app_login_without_repeating_oauth(self):
        client = self.client()
        responses = [
            (503, {}, b""),
            (200, {}, b'{"data": [{"token": "profile-token", "codMin": "cod-min", "opzioni": []}]}'),
            (200, {}, b'{"data": {}}'),
            (200, {}, b'{"data": {"alunno": {"nome": "Mario"}}}'),
        ]
        with patch(
            "didup_client.oauth_login",
            return_value={"access_token": "token", "version": "1.30.0"},
        ) as oauth, patch("didup_client._request", side_effect=responses) as request, patch(
            "didup_client.time.sleep"
        ):
            dashboard, profile = client.login()

        self.assertEqual(dashboard, {})
        self.assertEqual(profile, {"nome": "Mario"})
        self.assertEqual(oauth.call_count, 1)
        self.assertEqual(request.call_count, 4)

    def test_oauth_transient_error_is_retried(self):
        client = self.client()
        with patch(
            "didup_client.oauth_login",
            side_effect=[AuthError("argo_token_rejected", 503), {"access_token": "token", "version": "1.30.0"}],
        ) as oauth, patch.object(client, "_api", side_effect=[PROFILES, {"data": {}}]), patch.object(
            client, "_profile", return_value={}
        ), patch("didup_client.time.sleep") as sleep:
            client.login()

        self.assertEqual(oauth.call_count, 2)
        self.assertEqual([call.args[0] for call in sleep.call_args_list], [2.0])

    def test_oauth_rejected_credentials_are_not_retried(self):
        client = self.client()
        with patch(
            "didup_client.oauth_login", side_effect=AuthError("didup_credentials_rejected", 401)
        ) as oauth, patch("didup_client.time.sleep") as sleep:
            with self.assertRaises(AuthError):
                client.login()

        self.assertEqual(oauth.call_count, 1)
        sleep.assert_not_called()


if __name__ == "__main__":
    unittest.main()
