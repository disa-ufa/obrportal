from pathlib import Path

ROOT = Path("frontend/src")

PATTERNS = [
    "err.status ||",
    "err.message ||",
    '`${err.status || ""} ${err.message}`.trim()',
    '`${err.status || ""} ${err.message}`',
    'setError(`',
    'setActionError(`',
]

bad_bom = []
bad_patterns = []

for path in list(ROOT.rglob("*.js")) + list(ROOT.rglob("*.jsx")):
    text = path.read_text(encoding="utf-8")

    if "\ufeff" in text:
        bad_bom.append(path)

    for pattern in PATTERNS:
        if pattern in text:
            bad_patterns.append((path, pattern))

if bad_bom:
    print("BOM markers found:")
    for path in bad_bom:
        print(f" - {path}")

if bad_patterns:
    print("Raw frontend API error rendering found:")
    for path, pattern in bad_patterns:
        print(f" - {path}: {pattern}")

if bad_bom or bad_patterns:
    raise SystemExit(1)

print("frontend API error/BOM guard passed")
