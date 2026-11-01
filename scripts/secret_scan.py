from __future__ import annotations

import ast
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

GENERIC_SECRET_ASSIGNMENT_RE = re.compile(
    r"(?i)(?<![\w-])(?P<key_quote>['\"]?)(?:"
    r"secret|service_secret|api_key|apikey|access_key|secret_key|"
    r"token|password|passwd|pwd|client_secret"
    r")(?P=key_quote)\s*[:=]\s*"
    r'''(?:"(?P<double>(?:\\.|[^"\\])*)"|'(?P<single>(?:\\.|[^'\\])*)'|`(?P<template>[^`]*)`|(?P<bare>[^'"`\s#,;}]+))'''
)


def is_binary(path: Path) -> bool:
    try:
        chunk = path.read_bytes()[:2048]
    except OSError:
        return False  # scan_file reports unreadable files instead of silently skipping them.

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
    return lowered in SAFE_VALUE_MARKERS


def looks_like_code_reference(path: Path, value: str) -> bool:
    if path.suffix.lower() not in SOURCE_CODE_EXTENSIONS:
        return False
    # Only unquoted syntax from this assignment can be a reference. Adjacent
    # comments, other statements and words inside a literal never grant a bypass.
    return bool(re.fullmatch(
        r"[A-Za-z_$][A-Za-z0-9_$]*"
        r"(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*(?:\([^)]*\)?)?",
        value,
    ))


def scan_generic_assignment(path: Path, line: str, line_number: int) -> list[str]:
    findings: list[str] = []

    if path.suffix.lower() == ".py":
        return scan_python_assignments(path, line, line_number - 1)

    for match in GENERIC_SECRET_ASSIGNMENT_RE.finditer(line):
        value = next(match.group(name) for name in ("double", "single", "template", "bare")
                     if match.group(name) is not None)
        quoted = match.group("bare") is None
        if not value or has_safe_marker(value):
            continue
        if not quoted and looks_like_code_reference(path, value):
            continue
        if len(value) < 12:
            continue
        relative_path = path.relative_to(ROOT)
        findings.append(f"{relative_path}:{line_number}: possible generic_secret_assignment")

    return findings


def scan_python_assignments(path: Path, source: str, offset: int = 0) -> list[str]:
    """Inspect syntax, never execute source or discard literal quotation context."""
    try:
        tree = ast.parse(source)
    except SyntaxError:
        # Invalid Python must not silently turn into a clean scan.
        return [f"{path.relative_to(ROOT)}:{offset + 1}: python_parse_error"]

    def secret_name(name: str) -> bool:
        return bool(re.fullmatch(
            r"(?i)(?:secret|service_secret|api_key|apikey|access_key|secret_key|"
            r"token|password|passwd|pwd|client_secret)", name))

    def target_name(node: ast.AST) -> str:
        if isinstance(node, ast.Name):
            return node.id
        if isinstance(node, ast.Attribute):
            return node.attr
        if isinstance(node, ast.Subscript) and isinstance(node.slice, ast.Constant):
            return str(node.slice.value)
        return ""

    def literals(node: ast.AST) -> list[str]:
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            return [node.value]
        if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
            left, right = literals(node.left), literals(node.right)
            return [a + b for a in left for b in right] if left and right else left + right
        if isinstance(node, ast.JoinedStr):
            return [part.value for part in node.values
                    if isinstance(part, ast.Constant) and isinstance(part.value, str)]
        if isinstance(node, ast.IfExp):
            return literals(node.body) + literals(node.orelse)
        if isinstance(node, ast.BoolOp):
            return [s for value in node.values for s in literals(value)]
        if isinstance(node, ast.Call):
            # Environment variable names are references; defaults can be secrets.
            name = target_name(node.func)
            result = literals(node.args[1]) if name in {"getenv", "get"} and len(node.args) > 1 else []
            return result + [s for kw in node.keywords if kw.arg in {"default", "fallback"}
                             for s in literals(kw.value)]
        return []

    candidates = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if secret_name(target_name(target)):
                    candidates.append((node.value, node.lineno))
        elif isinstance(node, (ast.AnnAssign, ast.NamedExpr)):
            if node.value is not None and secret_name(target_name(node.target)):
                candidates.append((node.value, node.lineno))
        elif isinstance(node, ast.keyword) and node.arg and secret_name(node.arg):
            candidates.append((node.value, node.lineno))
        elif isinstance(node, ast.Dict):
            for key, value in zip(node.keys, node.values):
                if isinstance(key, ast.Constant) and isinstance(key.value, str) and secret_name(key.value):
                    candidates.append((value, key.lineno))
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda)):
            args = node.args
            positional = args.posonlyargs + args.args
            for arg, default in list(zip(positional[-len(args.defaults):], args.defaults)) + list(zip(args.kwonlyargs, args.kw_defaults)):
                if default is not None and secret_name(arg.arg):
                    candidates.append((default, default.lineno))

    findings = set()
    for value, lineno in candidates:
        if any(len(item) >= 12 and not has_safe_marker(item)
               for item in literals(value)):
            findings.add(f"{path.relative_to(ROOT)}:{lineno + offset}: possible generic_secret_assignment")
    return sorted(findings)


def scan_file(path: Path) -> list[str]:
    findings: list[str] = []

    try:
        source = path.read_text(encoding="utf-8-sig", errors="ignore")
        lines = source.splitlines()
    except OSError:
        return [f"{path.relative_to(ROOT)}:1: file_read_error"]

    for line_number, line in enumerate(lines, start=1):
        for name, pattern in SECRET_PATTERNS:
            if pattern.search(line):
                relative_path = path.relative_to(ROOT)
                findings.append(f"{relative_path}:{line_number}: possible {name}")

        if path.suffix.lower() != ".py":
            findings.extend(scan_generic_assignment(path, line, line_number))

    if path.suffix.lower() == ".py":
        findings.extend(scan_python_assignments(path, source))

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
