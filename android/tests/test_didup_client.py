import json
import sys
import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import patch

PYTHON_DIR = Path(__file__).resolve().parents[1] / "app" / "src" / "main" / "python"
sys.path.insert(0, str(PYTHON_DIR))

from didup_auth import AuthError
from didup_client import DidupClient, DidupError, WEB_API_BASE

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

    def test_503_diagnostic_contains_safe_response_metadata_only(self):
        client = self.client()
        client.access_token = "must-not-leak"
        client.access_token_expires_at = 1_800_000_000
        with patch(
            "didup_client._request",
            return_value=(503, {"Server": "argo-gateway", "X-Request-Id": "req-123_ab"}, b"secret body"),
        ), patch("didup_client.time.sleep"):
            with self.assertRaises(DidupError) as raised:
                client._api("POST", "login")

        diagnostic = raised.exception.diagnostic
        self.assertIn("client 1.29.2", diagnostic)
        self.assertIn("header scadenza OAuth presente", diagnostic)
        self.assertIn("server argo-gateway", diagnostic)
        self.assertIn("id richiesta req-123_ab", diagnostic)
        self.assertNotIn("must-not-leak", diagnostic)
        self.assertNotIn("secret body", diagnostic)

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
            (403, {}, b'{"message":"Access Denied"}'),
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
        self.assertEqual(request.call_count, 5)
        self.assertTrue(request.call_args_list[0].args[2].startswith(WEB_API_BASE))
        self.assertEqual(request.call_args_list[0].kwargs["headers"]["os-type"], "WEB")
        self.assertTrue(request.call_args_list[1].args[2].startswith("https://www.portaleargo.it/appfamiglia/api/rest/"))

    def test_login_uses_current_web_backend_and_empty_login_payload(self):
        client = self.client()
        responses = [
            (200, {}, b'{"data": [{"token": "profile-token", "codMin": "cod-min", "opzioni": []}]}'),
            (200, {}, b'{"data": {}}'),
            (200, {}, b'{"data": {"alunno": {"nome": "Mario"}}}'),
        ]
        with patch(
            "didup_client.oauth_login",
            return_value={"access_token": "token", "expires_at": 1_800_000_000, "version": "1.30.3"},
        ), patch("didup_client._request", side_effect=responses) as request:
            client.login()

        first_call = request.call_args_list[0]
        self.assertEqual(first_call.args[2], WEB_API_BASE + "login")
        self.assertEqual(first_call.kwargs["data"], b"{}")
        self.assertEqual(first_call.kwargs["headers"]["argo-client-version"], "4.3.0")
        self.assertEqual(first_call.kwargs["headers"]["os-type"], "WEB")
        self.assertNotIn("x-date-exp-auth", first_call.kwargs["headers"])
        self.assertTrue(request.call_args_list[1].args[2].startswith(WEB_API_BASE))
        dashboard_payload = json.loads(request.call_args_list[1].kwargs["data"])
        self.assertIsNone(dashboard_payload["opzioni"])

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


class DidupClientCircularAttachmentTests(unittest.TestCase):
    def client(self) -> DidupClient:
        client = DidupClient("SC12345", "utente", "password")
        client.api_mode = "web"
        client.api_base = WEB_API_BASE
        return client

    def test_web_profile_extracts_pk_scheda(self):
        client = self.client()
        response = {
            "data": {
                "profilo": {
                    "scheda": {"pk": "profile-scheda-123"},
                    "nominativo": "Studente",
                }
            }
        }
        with patch.object(client, "_api", return_value=response):
            profile = client._profile()

        self.assertEqual(client.profile_pk, "profile-scheda-123")
        self.assertEqual(profile["nominativo"], "Studente")

    def test_fetches_bacheca_history_when_dashboard_omits_attachment_list(self):
        client = self.client()
        client.profile_pk = "profile-scheda-123"
        dashboard = {
            "bacheca": [
                {"pk": "notice-1", "oggetto": "Circolare", "messaggio": "Testo circolare"}
            ]
        }
        history = {
            "data": {
                "bacheca": [
                    {
                        "pk": "notice-1",
                        "listaAllegati": [
                            {
                                "pk": "attachment-uid-1",
                                "nomeFile": "circolare.pdf",
                                "url": "https://bucket.s3.amazonaws.com/circolare.pdf?sig=temp",
                            }
                        ],
                    }
                ]
            }
        }

        with patch.object(client, "_api", return_value=history) as api:
            result = client._enrich_bacheca_attachments(dashboard)

        api.assert_called_once_with(
            "POST",
            "famiglia/storicobacheca",
            payload={"pkScheda": "profile-scheda-123"},
        )
        self.assertEqual(len(result["bacheca"]), 1)
        self.assertEqual(result["bacheca"][0]["messaggio"], "Testo circolare")
        self.assertEqual(
            result["bacheca"][0]["listaAllegati"][0]["pk"], "attachment-uid-1"
        )

    def test_accepts_history_returned_as_a_direct_list(self):
        client = self.client()
        client.profile_pk = "profile-scheda-123"
        dashboard = {"bacheca": [{"pk": "notice-1", "oggetto": "Circolare"}]}
        history = [{"pk": "notice-1", "listaAllegati": [{"pk": "file-1"}]}]

        with patch.object(client, "_api", return_value=history):
            result = client._enrich_bacheca_attachments(dashboard)

        self.assertEqual(result["bacheca"][0]["listaAllegati"][0]["pk"], "file-1")
        self.assertEqual(client.attachment_history_diagnostic, "")

    def test_malformed_history_response_is_reported_as_retryable(self):
        client = self.client()
        client.profile_pk = "profile-scheda-123"
        dashboard = {"bacheca": [{"pk": "notice-1", "oggetto": "Circolare"}]}

        with patch.object(client, "_api", return_value={"data": {"unexpected": []}}):
            result = client._enrich_bacheca_attachments(dashboard)

        self.assertEqual(result, dashboard)
        self.assertIn("risposta in formato inatteso", client.attachment_history_diagnostic)
        self.assertTrue(client.attachment_history_retryable)

    def test_web_attachment_uses_general_bacheca_route_with_uid_only(self):
        client = self.client()
        client.profile_pk = "profile-scheda-123"
        url = "https://bucket.s3.amazonaws.com/circolare.pdf?sig=temporary"
        with patch.object(client, "_api", return_value={"data": {"url": url}}) as api, patch(
            "didup_client.urllib.request.build_opener"
        ) as build_opener:
            downloaded = build_opener.return_value.open.return_value.__enter__.return_value
            downloaded.geturl.return_value = url
            downloaded.read.return_value = b"%PDF-1.7\nexample"
            result = client.download_attachment("attachment-uid-1", "circolare.pdf")

        api.assert_called_once_with(
            "POST",
            "famiglia/downloadallegatobacheca",
            payload={"uid": "attachment-uid-1"},
        )
        request = build_opener.return_value.open.call_args.args[0]
        self.assertEqual(request.get_header("Origin"), "https://didattica.portaleargo.it")
        self.assertEqual(request.get_header("Referer"), "https://didattica.portaleargo.it/famiglia/")
        self.assertEqual(result["extension"], "pdf")
        self.assertEqual(result["content"], b"%PDF-1.7\nexample")

    def test_web_attachment_accepts_openapi_string_url_response(self):
        client = self.client()
        client.profile_pk = "profile-scheda-123"
        url = "https://bucket.s3.amazonaws.com/circolare.pdf?sig=fresh"
        with patch.object(client, "_api", return_value=url), patch(
            "didup_client.urllib.request.build_opener"
        ) as build_opener:
            downloaded = build_opener.return_value.open.return_value.__enter__.return_value
            downloaded.geturl.return_value = url
            downloaded.read.return_value = b"%PDF-1.7\nexample"
            result = client.download_attachment("attachment-uid-1", "circolare.pdf")

        request = build_opener.return_value.open.call_args.args[0]
        self.assertEqual(request.full_url, url)
        self.assertEqual(result["extension"], "pdf")


if __name__ == "__main__":
    unittest.main()
