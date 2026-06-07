from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]

FORBIDDEN_BY_FILE = {
    "frontend/index.html": [
        "Stage 6",
        "Stage 7",
        "????????? ? Stage",
    ],
    "frontend/src/components/layout/PublicShell.jsx": [
        "Stage 6",
        "Stage 7",
        "????????? ??????",
    ],
    "frontend/src/components/layout/AppShell.jsx": [
        "Stage 6",
        "Stage 7",
    ],
    "frontend/src/utils/publicRoutes.js": [
        "?????? ? ObrPortal",
        "????????? ??????",
    ],
}

REQUIRED_BY_FILE = {
    "frontend/index.html": [
        "??????????????? ?????? ???? ????",
    ],
    "frontend/src/components/layout/PublicShell.jsx": [
        "???? ????",
        "??????????????? ??????",
        "??????? ?????????????",
    ],
    "frontend/src/components/layout/AppShell.jsx": [
        "???????????????? ??????",
    ],
    "frontend/src/utils/publicRoutes.js": [
        "??????? ????????????? ???????",
    ],
}

errors = []

for relative_path, fragments in FORBIDDEN_BY_FILE.items():
    path = ROOT / relative_path
    if not path.exists():
        errors.append(f"{relative_path} does not exist")
        continue

    text = path.read_text(encoding="utf-8")
    found = [fragment for fragment in fragments if fragment in text]
    if found:
        errors.append(f"{relative_path} contains forbidden fragments: {found}")

for relative_path, fragments in REQUIRED_BY_FILE.items():
    path = ROOT / relative_path
    if not path.exists():
        errors.append(f"{relative_path} does not exist")
        continue

    text = path.read_text(encoding="utf-8")
    missing = [fragment for fragment in fragments if fragment not in text]
    if missing:
        errors.append(f"{relative_path} misses required fragments: {missing}")

if errors:
    print("stage 75.1 public UI cleanup guard failed:")
    for error in errors:
        print(f" - {error}")
    sys.exit(1)

print("stage 75.1 public UI cleanup guard passed")
