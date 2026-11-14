"""Regression checks for the release's static frontend and internal API route."""
import contextlib
import io
import unittest
from pathlib import Path
from unittest.mock import patch

import check_frontend_static_serving as guard


class FrontendStaticServingTests(unittest.TestCase):
    def setUp(self):
        self.nginx = guard.NGINX_CONF.read_text(encoding="utf-8")
        self.dockerfile = guard.DOCKERFILE.read_text(encoding="utf-8")

    def test_release_configuration_passes(self):
        with contextlib.redirect_stdout(io.StringIO()):
            guard.main()

    def test_locked_install_accepts_optional_flags(self):
        for command in ["RUN npm ci", "RUN npm ci --no-audit --no-fund",
                        "RUN npm ci --no-fund --no-audit"]:
            guard.require_locked_install(command)

    def test_install_guard_rejects_comments_and_masked_failures(self):
        for command in ["RUN npm install", "# RUN npm ci", "RUN echo npm ci",
                        "RUN npm ci || true", "RUN npm circus", "RUN true # RUN npm ci"]:
            with self.subTest(command=command), self.assertRaises(SystemExit):
                guard.require_locked_install(command)

    def test_lockfile_is_required(self):
        with patch.object(guard, "LOCKFILE") as lockfile:
            lockfile.exists.return_value = False
            lockfile.relative_to.return_value = Path("frontend/package-lock.json")
            with self.assertRaisesRegex(SystemExit, "missing required file:.*package-lock.json"):
                guard.main()

    def test_api_target_and_prefix_are_fixed(self):
        for target in ["http://backend:8000/", "http://example.com", "http://$upstream"]:
            with self.subTest(target=target), self.assertRaises(SystemExit):
                guard.require_api_proxy(self.nginx.replace("http://backend:8000", target))

    def test_proxy_outside_api_is_rejected(self):
        for location in ["location / {", "location /assets/ {", "location = /healthz {"]:
            source = self.nginx.replace(location, location + "\nproxy_pass http://backend:8000;")
            with self.subTest(location=location), self.assertRaises(SystemExit):
                guard.require_api_proxy(source)

    def test_missing_duplicate_and_nested_api_proxy_are_rejected(self):
        variants = [
            self.nginx.replace("proxy_pass http://backend:8000;", ""),
            self.nginx.replace("proxy_pass http://backend:8000;", "# proxy_pass http://backend:8000;"),
            self.nginx.replace("proxy_pass http://backend:8000;", "proxy_pass http://backend:8000;" * 2),
            self.nginx.replace("location /api/ {", "location /api/ { if ($request_method) {") + "}",
            self.nginx.replace("location /api/", "location /other/"),
            self.nginx + "server { location /api/ {} }",
        ]
        for source in variants:
            with self.subTest(variant=variants.index(source)), self.assertRaises(SystemExit):
                guard.require_api_proxy(source)

    def test_forwarded_headers_are_required_and_unique(self):
        for directive in ["proxy_set_header Host $host;", "proxy_set_header X-Forwarded-Proto $scheme;",
                          "proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;"]:
            for replacement in ["", "# " + directive, directive * 2]:
                with self.subTest(directive=directive, replacement=replacement), self.assertRaises(SystemExit):
                    guard.require_api_proxy(self.nginx.replace(directive, replacement))

    def test_comments_do_not_create_proxy_directives(self):
        guard.require_api_proxy(self.nginx + "\n# location / { proxy_pass http://example.com; }\n")

    def test_signed_scan_proxy_is_strict(self):
        variants = {
            "wrong_limit": self.nginx.replace(
                "client_max_body_size 10551296;",
                "client_max_body_size 10551297;",
            ),
            "missing_limit": self.nginx.replace(
                "client_max_body_size 10551296;", ""
            ),
            "broadened_route": self.nginx.replace(
                "location ~ ^/api/v1/admin/mintrud/protocol-drafts/[^/]+/signed-scan$",
                "location ~ ^/api/.*",
            ),
            "external_target": self.nginx.replace(
                "proxy_pass http://backend:8000;",
                "proxy_pass http://example.com;", 1,
            ),
            "missing_scan_header": self.nginx.replace(
                "proxy_set_header Host $host;", "", 1,
            ),
            "extra_proxy": self.nginx.replace(
                "location /assets/ {",
                "location /assets/ {\nproxy_pass http://backend:8000;",
            ),
            "extra_limit": self.nginx.replace(
                "location /assets/ {",
                "location /assets/ {\nclient_max_body_size 10551296;",
            ),
        }
        for name, source in variants.items():
            with self.subTest(case=name):
                with self.assertRaises(SystemExit):
                    guard.require_api_proxy(source)

    def test_malformed_blocks_fail_closed(self):
        for source in [self.nginx + "}", self.nginx[:-2], self.nginx + 'set $x "unterminated;']:
            with self.assertRaises(SystemExit):
                guard.require_api_proxy(source)

    def test_static_serving_markers_remain_required(self):
        for marker in guard.NGINX_MARKERS:
            with contextlib.redirect_stdout(io.StringIO()), self.assertRaises(SystemExit):
                guard.require_markers("nginx", self.nginx.replace(marker, ""), guard.NGINX_MARKERS)
        for marker in guard.DOCKERFILE_MARKERS:
            with contextlib.redirect_stdout(io.StringIO()), self.assertRaises(SystemExit):
                guard.require_markers("Dockerfile", self.dockerfile.replace(marker, ""), guard.DOCKERFILE_MARKERS)


if __name__ == "__main__":
    unittest.main()
