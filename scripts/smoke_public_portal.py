import os
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

BASE_URL = os.getenv("PUBLIC_BASE_URL", "http://localhost:5173").rstrip("/")

PUBLIC_ROUTES = [
    "/",
    "/catalog",
    "/courses/povyshenie-kvalifikatsii-pedagogicheskih-rabotnikov",
    "/organization-info",
    "/verify-document",
    "/contacts",
    "/faq",
    "/privacy",
    "/offer",
    "/login",
    "/register",
    "/account",
    "/admin",
        "/admin/documents",
        "/admin/courses",
        "/admin/enrollments",
    "/unknown-page",
]

def fetch(path: str) -> tuple[int, str]:
    url = f"{BASE_URL}{path}"
    request = Request(
        url,
        headers={
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "User-Agent": "obrportal-public-smoke/1.0",
        },
        method="GET",
    )

    with urlopen(request, timeout=15) as response:
        status = response.status
        body = response.read().decode("utf-8", errors="replace")
        return status, body

def assert_html_shell(path: str, status: int, body: str) -> None:
    if status != 200:
        raise AssertionError(f"{path}: expected 200, got {status}")

    if "<!doctype html>" not in body.lower() and "<html" not in body.lower():
        raise AssertionError(f"{path}: response is not HTML")

    if 'id="root"' not in body and "id='root'" not in body:
        raise AssertionError(f"{path}: missing root mount node")

def main() -> int:
    checks: list[str] = []

    for path in PUBLIC_ROUTES:
        try:
            status, body = fetch(path)
        except HTTPError as exc:
            print(f"FAIL {path}: HTTP {exc.code}")
            return 1
        except URLError as exc:
            print(f"FAIL {path}: {exc}")
            return 1
        except Exception as exc:
            print(f"FAIL {path}: {exc}")
            return 1

        assert_html_shell(path, status, body)
        checks.append(f"{path} ok")

    print("Smoke public portal passed:")
    for item in checks:
        print(f" - {item}")

    return 0

if __name__ == "__main__":
    sys.exit(main())