import io
import sys
import urllib.error
import unittest
import zipfile
from pathlib import Path
from unittest.mock import Mock, patch

PYTHON_DIR = Path(__file__).resolve().parents[1] / "app" / "src" / "main" / "python"
sys.path.insert(0, str(PYTHON_DIR))

from didup_client import DidupClient, DidupError, WEB_API_BASE


class FakeDownload(io.BytesIO):
    def __init__(self, content: bytes, url: str):
        super().__init__(content)
        self.url = url

    def geturl(self):
        return self.url

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        self.close()


class DidupAttachmentTests(unittest.TestCase):
    def setUp(self):
        self.client = DidupClient("school", "student", "not-a-real-password")

    def test_downloads_pdf_without_forwarding_auth_headers(self):
        signed_url = "https://bucket.s3.amazonaws.com/circular.pdf?X-Amz-Signature=fake"
        fake_opener = Mock()
        fake_opener.open.return_value = FakeDownload(b"%PDF-1.7\nbody", signed_url)
        with patch.object(self.client, "_api", return_value={"url": signed_url}), patch(
            "didup_client.urllib.request.build_opener", return_value=fake_opener
        ):
            result = self.client.download_attachment("argo-uid", "circular.pdf")

        request = fake_opener.open.call_args.args[0]
        self.assertIsNone(request.get_header("Authorization"))
        self.assertEqual(result["extension"], "pdf")
        self.assertTrue(result["path"].startswith("circulars/"))
        self.assertEqual(result["content"], b"%PDF-1.7\nbody")

    def test_web_download_uses_family_web_origin_and_referer(self):
        self.client.api_mode = "web"
        self.client.api_base = WEB_API_BASE
        signed_url = "https://bucket.s3.amazonaws.com/circular.pdf?X-Amz-Signature=fake"
        fake_opener = Mock()
        fake_opener.open.return_value = FakeDownload(b"%PDF-1.7\nbody", signed_url)
        with patch.object(self.client, "_api", return_value={"url": signed_url}), patch(
            "didup_client.urllib.request.build_opener", return_value=fake_opener
        ):
            self.client.download_attachment("argo-uid", "circular.pdf")

        request = fake_opener.open.call_args.args[0]
        self.assertEqual(request.get_header("Origin"), "https://didattica.portaleargo.it")
        self.assertEqual(
            request.get_header("Referer"), "https://didattica.portaleargo.it/famiglia/"
        )

    def test_http_error_reports_status_and_host_without_signed_query(self):
        signed_url = "https://bucket.s3.amazonaws.com/circular.pdf?X-Amz-Signature=secret-value"
        fake_opener = Mock()
        fake_opener.open.side_effect = urllib.error.HTTPError(
            signed_url,
            403,
            "Forbidden",
            {},
            io.BytesIO(b"<Error><Code>AccessDenied</Code><Message>Access Denied</Message></Error>"),
        )
        with patch("didup_client.urllib.request.build_opener", return_value=fake_opener):
            with self.assertRaises(DidupError) as raised:
                self.client.download_attachment_url(signed_url, "circular.pdf")

        self.assertEqual(raised.exception.http_status, 403)
        self.assertIn("host bucket.s3.amazonaws.com", raised.exception.diagnostic)
        self.assertIn("S3 AccessDenied", raised.exception.diagnostic)
        self.assertNotIn("X-Amz-Signature", raised.exception.diagnostic)
        self.assertNotIn("secret-value", raised.exception.diagnostic)

    def test_downloads_pdf_from_direct_signed_url_without_uid(self):
        signed_url = "https://bucket.s3.amazonaws.com/circular.pdf?X-Amz-Signature=fake"
        fake_opener = Mock()
        fake_opener.open.return_value = FakeDownload(b"%PDF-1.7\nbody", signed_url)
        with patch("didup_client.urllib.request.build_opener", return_value=fake_opener):
            result = self.client.download_attachment_url(signed_url, "circular.pdf")

        request = fake_opener.open.call_args.args[0]
        self.assertIsNone(request.get_header("Authorization"))
        self.assertEqual(result["content"], b"%PDF-1.7\nbody")
        self.assertTrue(result["path"].endswith(".pdf"))

    def test_rejects_untrusted_direct_url_before_download(self):
        with patch("didup_client.urllib.request.build_opener") as build_opener:
            with self.assertRaises(DidupError):
                self.client.download_attachment_url("https://attacker.invalid/file.pdf", "file.pdf")
        build_opener.assert_not_called()

    def test_validates_docx_zip_contents(self):
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w") as archive:
            archive.writestr("[Content_Types].xml", "<Types/>")
            archive.writestr("word/document.xml", "<document/>")
        signed_url = "https://download.portaleargo.it/circular.docx"
        fake_opener = Mock()
        fake_opener.open.return_value = FakeDownload(buffer.getvalue(), signed_url)
        with patch.object(self.client, "_api", return_value={"url": signed_url}), patch(
            "didup_client.urllib.request.build_opener", return_value=fake_opener
        ):
            result = self.client.download_attachment("argo-uid", "circular.docx")
        self.assertEqual(result["extension"], "docx")
        self.assertEqual(
            result["mime"],
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        self.assertTrue(result["path"].endswith(".docx"))

    def test_rejects_untrusted_host_before_download(self):
        with patch.object(self.client, "_api", return_value={"url": "https://attacker.invalid/file.pdf"}), patch(
            "didup_client.urllib.request.build_opener"
        ) as build_opener:
            with self.assertRaises(DidupError):
                self.client.download_attachment("argo-uid", "file.pdf")
        build_opener.assert_not_called()

    def test_rejects_non_document_payload(self):
        signed_url = "https://bucket.s3.amazonaws.com/not-a-pdf?X-Amz-Signature=fake"
        fake_opener = Mock()
        fake_opener.open.return_value = FakeDownload(b"<html>login required</html>", signed_url)
        with patch.object(self.client, "_api", return_value={"url": signed_url}), patch(
            "didup_client.urllib.request.build_opener", return_value=fake_opener
        ):
            with self.assertRaises(DidupError):
                self.client.download_attachment("argo-uid", "notice.pdf")


if __name__ == "__main__":
    unittest.main()
