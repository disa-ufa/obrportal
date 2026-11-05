"""Configuration parity without requiring nginx or Docker locally."""
import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'backend'))
from app.api.signed_scan_upload_limit import MAX_SIGNED_SCAN_REQUEST_BYTES
from check_frontend_static_serving import require_api_proxy


class ProxyConfigurationTests(unittest.TestCase):
    def test_only_scan_location_raises_the_limit_with_exact_asgi_parity(self):
        source = (ROOT/'frontend/nginx.conf').read_text(encoding='utf-8')
        require_api_proxy(source)
        path = '~ ^/api/v1/admin/mintrud/protocol-drafts/[^/]+/signed-scan$'
        match = re.search(r'location '+re.escape(path)+r' \{([^{}]*)\}',source)
        self.assertIsNotNone(match)
        body = match[1]
        self.assertEqual(source.count('client_max_body_size'), 1)
        self.assertEqual(int(re.search(r'client_max_body_size\s+(\d+);', body)[1]), MAX_SIGNED_SCAN_REQUEST_BYTES)
        self.assertIn('proxy_pass http://backend:8000;', body)
        for header, value in [('Host','$host'),('X-Forwarded-Proto','$scheme'),('X-Forwarded-For','$proxy_add_x_forwarded_for')]:
            self.assertIn(f'proxy_set_header {header} {value};', body)
        ordinary = re.search(r'location /api/ \{([^{}]*)\}', source)[1]
        self.assertNotIn('client_max_body_size', ordinary)
        self.assertIn('proxy_pass http://backend:8000;', ordinary)
        self.assertNotIn('error_page 413', source)

    def test_guard_rejects_unsafe_or_unscoped_scan_limits(self):
        source = (ROOT/'frontend/nginx.conf').read_text(encoding='utf-8')
        for changed in [source.replace('10551296','0'), source.replace('10551296','11m'),
                        source.replace('client_max_body_size 10551296;',''),
                        source.replace('location /api/ {','location /api/ { client_max_body_size 10551296;'),
                        source.replace('/[^/]+/signed-scan$', '/.*$'),
                        source.replace('http://backend:8000;', 'http://backend:8000/;',1),
                        source+'\nserver { location /extra { proxy_pass http://backend:8000; } }']:
            with self.subTest(source=changed), self.assertRaises(SystemExit):
                require_api_proxy(changed)


if __name__ == '__main__': unittest.main()
