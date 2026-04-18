import sys
import httpx

CHECKS = [
    ("backend health", "http://localhost:8000/health"),
    ("backend ready", "http://localhost:8000/api/v1/ready"),
    ("frontend", "http://localhost:5173"),
]


def main() -> int:
    ok = True
    for name, url in CHECKS:
        try:
            r = httpx.get(url, timeout=5)
            status = "OK" if r.status_code < 500 else "FAIL"
            print(f"{status:4} {name:16} {r.status_code} {url}")
            ok = ok and r.status_code < 500
        except Exception as exc:  # noqa: BLE001
            ok = False
            print(f"FAIL {name:16} {type(exc).__name__}: {exc}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
