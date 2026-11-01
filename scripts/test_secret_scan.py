"""Synthetic regression fixtures; no live credentials are used."""
import contextlib
import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import secret_scan as scan

SAMPLE = "SecretValue987654321"


class SecretScannerTests(unittest.TestCase):
    def findings(self, source, filename="app.py"):
        return scan.scan_python_assignments(scan.ROOT / filename, source)

    def test_four_reported_bypasses(self):
        cases = [
            'password = "SecretValue987654321"',
            'token = "ActualToken987654321"',
            'password = "obrportalRealSecret987654321"',
            'password = "SecretValue987654321"; payload.get("x")',
        ]
        for source in cases:
            with self.subTest(case=cases.index(source)):
                self.assertTrue(self.findings(source))

    def test_runtime_expressions(self):
        values = ["Depends(oauth2_scheme)", "TRACK.set(True)",
                  "secrets.token_urlsafe(32)", "existing_password", "settings.password",
                  'payload.get("password")', 'os.getenv("ACCOUNT_PASSWORD")',
                  'get_required_env("ACCOUNT_PASSWORD")', 'learner_token("fixture")',
                  'response.json().get("token")', 'values["password"]']
        for value in values:
            with self.subTest(expression=value):
                self.assertEqual(self.findings("password = " + value), [])
        self.assertEqual(self.findings("client(password=existing_password)"), [])

    def test_quoted_runtime_spellings_are_literals(self):
        for value in ["Depends(oauth2_scheme)", "secrets.token_urlsafe(32)", "settings.password"]:
            self.assertTrue(self.findings("password = " + repr(value)))

    def test_safe_words_do_not_hide_secrets(self):
        for word in scan.SAFE_VALUE_MARKERS | {"test", "dummy", "fake"}:
            for value in (word + SAMPLE, SAMPLE + word, word + "-" + SAMPLE):
                self.assertTrue(self.findings("password = " + repr(value), "tests/test_config.py"))

    def test_allowlisted_and_example_filenames_do_not_bypass(self):
        for filename in ["tests/test_config.py", "test_auth_rbac_admin_api.py",
                         "smoke_auth_rbac.py", "example_credentials.py"]:
            self.assertTrue(self.findings("password = " + repr(SAMPLE), filename))

    def test_assignment_forms(self):
        for source in [
            "password: str = " + repr(SAMPLE),
            "client.password = " + repr(SAMPLE),
            "config['password'] = " + repr(SAMPLE),
            "password = token = " + repr(SAMPLE),
            "client(password=" + repr(SAMPLE) + ")",
            "config = {'password': " + repr(SAMPLE) + "}",
            "def connect(password=" + repr(SAMPLE) + "): pass",
            "def connect(*, token=" + repr(SAMPLE) + "): pass",
            "password = (\n    " + repr(SAMPLE) + "\n)",
            "password = 'SecretValue' + '987654321'",
            "password = os.getenv('ACCOUNT_PASSWORD', " + repr(SAMPLE) + ")",
            "password = Field(default=" + repr(SAMPLE) + ")",
            "password = existing or " + repr(SAMPLE),
        ]:
            self.assertTrue(self.findings(source))

    def test_unrelated_context_and_comments(self):
        for suffix in ['; payload.get("x")', ' # example localhost bearer', '; token = runtime_value']:
            self.assertTrue(self.findings("password = " + repr(SAMPLE) + suffix))
        self.assertEqual(self.findings('# password = "a sample in documentation"'), [])
        self.assertEqual(self.findings("source = " + repr('password = "a sample in documentation"')), [])

    def test_parse_error_is_not_clean(self):
        self.assertIn("python_parse_error", self.findings("password = (")[0])

    def test_existing_exact_placeholders(self):
        for value in scan.SAFE_VALUE_MARKERS:
            self.assertEqual(self.findings("password = " + repr(value)), [])

    def test_non_python_literals_and_allowed_paths(self):
        for filename in ["README.md", ".env.example", "docker-compose.yml", "config.js"]:
            hits = scan.scan_generic_assignment(scan.ROOT / filename,
                'password = "' + SAMPLE + '"; payload.get("x")', 1)
            self.assertTrue(hits)

    def test_file_and_cli_exit_and_redaction(self):
        with tempfile.TemporaryDirectory(dir=scan.ROOT) as folder:
            file = Path(folder) / "test_credentials.py"
            file.write_text("password = " + repr(SAMPLE), encoding="utf-8")
            self.assertTrue(scan.scan_file(file))
            output = io.StringIO()
            with patch.object(scan, "iter_files", return_value=[file]), contextlib.redirect_stdout(output):
                self.assertEqual(scan.main(), 1)
            self.assertNotIn(SAMPLE, output.getvalue())
            file.write_text("password = secrets.token_urlsafe(32)", encoding="utf-8")
            with patch.object(scan, "iter_files", return_value=[file]), contextlib.redirect_stdout(output):
                self.assertEqual(scan.main(), 0)

    def test_strong_signatures_not_suppressed_by_context(self):
        with tempfile.TemporaryDirectory(dir=scan.ROOT) as folder:
            file = Path(folder) / "example_config.py"
            marker = "-----BEGIN " + "PRIVATE KEY-----"
            file.write_text("# example " + marker, encoding="utf-8")
            self.assertTrue(any("private_key" in x for x in scan.scan_file(file)))

    def test_non_python_quoted_keys_and_literal_boundaries(self):
        for filename in ['config.json', 'config.js', 'settings.yml', '.env.example']:
            for source in [
                '"password": "' + SAMPLE + '"',
                "'password': '" + SAMPLE + "'",
                'password = `' + SAMPLE + '`',
                'password = "short#' + SAMPLE + '"',
                'password = "short ' + SAMPLE + '"',
                'password = "bearer' + SAMPLE + '"',
                'password = "localstorage.' + SAMPLE + '"',
            ]:
                with self.subTest(filename=filename, source=source):
                    self.assertTrue(scan.scan_generic_assignment(scan.ROOT / filename, source, 1))

    def test_non_python_runtime_references(self):
        for value in ['existing_password', 'settings.password', 'getStoredToken()',
                      'localStorage.getItem("auth_token")']:
            self.assertEqual(scan.scan_generic_assignment(
                scan.ROOT / 'config.js', 'password = ' + value, 1), [])

    def test_non_python_matches_whole_key(self):
        self.assertEqual(scan.scan_generic_assignment(scan.ROOT / 'routes.js',
            '"set-password": "/set-password"', 1), [])
        self.assertTrue(scan.scan_generic_assignment(scan.ROOT / 'config.json',
            '"password": "' + SAMPLE + '"', 1))

    def test_safe_words_do_not_hide_non_python_secrets(self):
        for word in scan.SAFE_VALUE_MARKERS | {'bearer', 'test', 'dummy', 'fake'}:
            self.assertTrue(scan.scan_generic_assignment(scan.ROOT / '.env.example',
                'password = "' + word + SAMPLE + '"', 1))

    def test_unreadable_file_is_not_clean(self):
        file = scan.ROOT / 'unreadable.txt'
        with patch.object(Path, 'read_text', side_effect=PermissionError):
            self.assertIn('file_read_error', scan.scan_file(file)[0])
        with patch.object(Path, 'read_bytes', side_effect=PermissionError):
            self.assertFalse(scan.should_skip(file))

    def test_all_strong_signatures_in_example_and_test_files(self):
        samples = {
            'private_key': '-----BEGIN ' + 'PRIVATE KEY-----',
            'telegram_bot_token': '123456789:' + 'A' * 35,
            'jwt_like_token': 'eyJ' + 'A' * 25 + '.' + 'B' * 25 + '.' + 'C' * 15,
        }
        with tempfile.TemporaryDirectory(dir=scan.ROOT) as folder:
            for name in ['.env.example', 'README.md', 'test_credentials.py', 'example.js']:
                file = Path(folder) / name
                for signature, sample in samples.items():
                    file.write_text('# example localhost ' + sample, encoding='utf-8')
                    self.assertTrue(any(signature in hit for hit in scan.scan_file(file)))


if __name__ == "__main__":
    unittest.main()
