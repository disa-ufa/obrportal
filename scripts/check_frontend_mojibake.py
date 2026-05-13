from pathlib import Path

ROOT = Path("frontend/src")

def build_mojibake_markers() -> list[str]:
    source_chars = (
        [chr(code) for code in range(0x0410, 0x0450)]
        + [chr(0x0401), chr(0x0451)]
        + [
            "\u00b7",
            "\u2014",
            "\u2013",
            "\u2026",
            "\u2116",
            "\u00ab",
            "\u00bb",
            "\u201c",
            "\u201d",
            "\u201e",
        ]
    )

    markers = set()

    for char in source_chars:
        try:
            marker = char.encode("utf-8").decode("cp1251")
        except UnicodeDecodeError:
            continue

        if marker != char and len(marker) > 1:
            markers.add(marker)

    return sorted(markers, key=len, reverse=True)


MOJIBAKE_MARKERS = build_mojibake_markers()


def main() -> None:
    bad = []

    for path in sorted(list(ROOT.rglob("*.js")) + list(ROOT.rglob("*.jsx"))):
        text = path.read_text(encoding="utf-8")

        for marker in MOJIBAKE_MARKERS:
            if marker in text:
                bad.append((path, marker))
                break

    if bad:
        print("Frontend mojibake text found:")
        for path, marker in bad:
            print(f" - {path}: {marker}")
        raise SystemExit(1)

    print("frontend mojibake guard passed")


if __name__ == "__main__":
    main()
