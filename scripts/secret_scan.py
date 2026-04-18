from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

EXCLUDED_DIRS = {
    ".git",
    ".venv",
    "node_modules",
    "dist",
    "build",
    "__pycache__",
    ".pytest_cache",
}

EXCLUDED_FILES = {
    ".env",
}

ALLOWED_FILES = {
    ".env.example",
    "docker-compose.yml",
    "README.md",
    "ci.yml",
    "smoke_auth_rbac.py",
    "test_auth_rbac_admin_api.py",
}

SECRET_PATTERNS = [
    ("telegram_bot_token", re.compile(r"\b\d{8,12}:[A-Za-z0-9_-]{30,}\b")),
    ("private_key", re.compile(r"-----BEGIN (RSA |EC |OPENSSH |DSA |)?PRIVATE KEY-----")),
    ("jwt_like_token", re.compile(r"\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b")),
    ("generic_secret_assignment", re.compile(
        r"(?i)\b("
        r"secret|service_secret|api_key|apikey|access_key|secret_key|"
        r"token|password|passwd|pwd|client_secret"
        r")\b\s*[:=]\s*['\"]?([A-Za-z0-9_./+=:@!#$%^&*~-]{12,})"
    )),
]

SAFE_VALUE_MARKERS = {
    "change-me",
    "changeme",
    "example",
    "placeholder",
    "local",
    "localhost",
    "admin123local2026",
    "learner123local2026",
    "minioadmin",
    "obrportal",
}


def is_binary(path: Path) -> bool:
    try:
        chunk = path.read_bytes()[:2048]
    except OSError:
        return True

    return b"\0" in chunk


def should_skip(path: Path) -> bool:
    relative_parts = set(path.relative_to(ROOT).parts)

    if relative_parts & EXCLUDED_DIRS:
        return True

    if path.name in EXCLUDED_FILES:
        return True

    if is_binary(path):
        return True

    return False


def is_allowed_context(path: Path, line: str) -> bool:
    lowered = line.lower()

    if path.name in ALLOWED_FILES:
        if any(marker in lowered for marker in SAFE_VALUE_MARKERS):
            return True

    if "example" in path.name.lower():
        return True

    return False


def scan_file(path: Path) -> list[str]:
    findings: list[str] = []

    try:
        lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    except OSError:
        return findings

    for line_number, line in enumerate(lines, start=1):
        if is_allowed_context(path, line):
            continue

        for name, pattern in SECRET_PATTERNS:
            if pattern.search(line):
                relative_path = path.relative_to(ROOT)
                findings.append(f"{relative_path}:{line_number}: possible {name}")

    return findings


def iter_files() -> list[Path]:
    return [
        path
        for path in ROOT.rglob("*")
        if path.is_file() and not should_skip(path)
    ]


def main() -> int:
    findings: list[str] = []

    for path in iter_files():
        findings.extend(scan_file(path))

    if findings:
        print("Secret scan failed. Possible secrets found:")
        for finding in findings:
            print(f" - {finding}")
        return 1

    print("Secret scan passed. No obvious secrets found.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
