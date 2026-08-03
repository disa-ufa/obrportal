from __future__ import annotations

import re
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

SOURCE_CODE_EXTENSIONS = {
    ".py",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
}

ALLOWED_FILES = {
    ".env.example",
    "docker-compose.yml",
    "README.md",
    "ci.yml",
    "smoke_auth_rbac.py",
    "test_auth_rbac_admin_api.py",
}

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

SECRET_PATTERNS = [
    ("telegram_bot_token", re.compile(r"\b\d{8,12}:[A-Za-z0-9_-]{30,}\b")),
    ("private_key", re.compile(r"-----BEGIN (RSA |EC |OPENSSH |DSA |)?PRIVATE KEY-----")),
    ("jwt_like_token", re.compile(r"\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b")),
]

TEST_FIXTURE_VALUE_RE = re.compile(
    r"(?i)(?:^|[^a-z0-9])"
    r"(?:test|dummy|fake|example|placeholder)"
    r"(?:[^a-z0-9]|$)"
)

GENERIC_SECRET_ASSIGNMENT_RE = re.compile(
    r"(?i)\b("
    r"secret|service_secret|api_key|apikey|access_key|secret_key|"
    r"token|password|passwd|pwd|client_secret"
    r")\b\s*[:=]\s*['\"]?([^'\"\s#,;}]+)"
)


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


def has_safe_marker(value: str) -> bool:
    lowered = value.lower()
    return any(marker in lowered for marker in SAFE_VALUE_MARKERS)


def is_allowed_context(path: Path, line: str) -> bool:
    lowered = line.lower()

    if path.name in ALLOWED_FILES and any(marker in lowered for marker in SAFE_VALUE_MARKERS):
        return True

    if "example" in path.name.lower():
        return True

    return False


def is_test_path(path: Path) -> bool:
    relative_parts = {
        part.lower()
        for part in path.relative_to(ROOT).parts
    }
    return (
        "tests" in relative_parts
        or path.name.lower().startswith("test_")
    )


def looks_like_test_fixture(path: Path, value: str) -> bool:
    if not is_test_path(path):
        return False

    normalized_value = value.strip("`'\"")
    return bool(TEST_FIXTURE_VALUE_RE.search(normalized_value))


def looks_like_code_reference(path: Path, line: str, value: str) -> bool:
    if path.suffix.lower() not in SOURCE_CODE_EXTENSIONS:
        return False

    lowered_line = line.lower()
    lowered_value = value.lower().strip("`'\"")

    code_markers = [
        "get_required_env(",
        "os.getenv(",
        "getenv(",
        "getstoredtoken(",
        "localstorage.",
        "payload.get(",
        "response.",
        "login(",
        "values.",
        "form.",
        ".trim(",
        "${",
        "bearer",
    ]

    if any(marker in lowered_line for marker in code_markers):
        return True

    if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", value):
        return True

    if re.fullmatch(
        r"[A-Za-z_][A-Za-z0-9_]*"
        r"(?:\.[A-Za-z_][A-Za-z0-9_]*)+",
        value,
    ):
        return True

    if lowered_value in {"token", "password", "secret", "headers", "payload"}:
        return True

    return False


def scan_generic_assignment(path: Path, line: str, line_number: int) -> list[str]:
    findings: list[str] = []

    if path.name in ALLOWED_FILES:
        return findings

    for match in GENERIC_SECRET_ASSIGNMENT_RE.finditer(line):
        value = match.group(2).strip().strip("'\"`")

        if not value:
            continue

        if has_safe_marker(value):
            continue

        if looks_like_test_fixture(path, value):
            continue

        if looks_like_code_reference(path, line, value):
            continue

        if len(value) < 12:
            continue

        relative_path = path.relative_to(ROOT)
        findings.append(f"{relative_path}:{line_number}: possible generic_secret_assignment")

    return findings


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

        findings.extend(scan_generic_assignment(path, line, line_number))

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
