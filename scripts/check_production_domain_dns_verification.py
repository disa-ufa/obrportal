from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DNS_PATH = ROOT / "docs" / "production-domain-dns-verification.md"

REQUIRED_RELEASE_TAG = "v0.1.0-stage6"
REQUIRED_RELEASE_COMMIT = "ac6f339d40567a107dd19f02ec778fbeb5e19971"
REQUIRED_STAGE7_COMMIT = "c7cd9ac4763bfab9f905b311eaf1ef4df9f30381"
REQUIRED_STAGE8_CHECKPOINT = "289add8"

REQUIRED_SECTIONS = [
    "# Production domain DNS verification",
    "## Purpose",
    "## Release baseline",
    "## Source documents",
    "## Current server state",
    "## Production domain decision",
    "## DNS setup requirement",
    "## Local DNS verification commands",
    "## Server-side DNS verification commands",
    "## Decision gate before reverse proxy installation",
    "## Acceptance criteria",
    "## DNS verification diagnostics",
]

REQUIRED_SOURCE_DOCUMENTS = [
    "docs/production-domain-reverse-proxy-decision.md",
    "docs/production-server-facts.md",
    "docs/production-fact-collection-result.md",
    "docs/production-server-remediation-plan.md",
    "docs/production-reverse-proxy-checklist.md",
]

REQUIRED_TABLE_ITEMS = [
    "Server",
    "Public IPv4",
    "Docker Compose",
    "Application directory",
    "Backup directory",
    "Production `.env`",
    "Reverse proxy",
    "Existing container",
    "Existing UDP port",
    "Production domain",
    "DNS provider/account",
    "DNS A-record target",
    "DNS AAAA-record",
    "Frontend public URL",
    "Backend public model",
    "Health URL",
    "Readiness URL",
    "Production domain selected",
    "DNS A-record created",
    "DNS A-record verified locally",
    "DNS A-record verified on server",
    "Reverse proxy choice confirmed",
    "HTTPS entrypoint can be configured",
    "Existing `amnezia-awg` preserved",
]

REQUIRED_COMMANDS = [
    "$PRODUCTION_DOMAIN = \"<production-domain>\"",
    "Resolve-DnsName $PRODUCTION_DOMAIN -Type A",
    "Resolve-DnsName $PRODUCTION_DOMAIN -Type AAAA -ErrorAction SilentlyContinue",
    "Test-NetConnection $PRODUCTION_DOMAIN -Port 80",
    "Test-NetConnection $PRODUCTION_DOMAIN -Port 443",
    "DOMAIN='<production-domain>'",
    "getent hosts \"$DOMAIN\" || true",
    "dig +short A \"$DOMAIN\" || true",
    "dig +short AAAA \"$DOMAIN\" || true",
    "curl -I \"http://$DOMAIN\" || true",
    "python .\\scripts\\check_production_domain_dns_verification.py",
]

REQUIRED_MARKERS = [
    "This document defines the safe production domain selection and DNS A-record verification workflow before reverse proxy installation and HTTPS entrypoint setup.",
    "It must not contain DNS account credentials, tokens, passwords, private keys, production `.env` values or any other secrets.",
    "- Release tag: `v0.1.0-stage6`",
    "- Release commit: `ac6f339d40567a107dd19f02ec778fbeb5e19971`",
    "- Stage 7 documentation baseline: `c7cd9ac4763bfab9f905b311eaf1ef4df9f30381`",
    "- Stage 8 current checkpoint: `289add8`",
    "| Server | `306733.fornex.cloud` | Current hostname. |",
    "| Public IPv4 | `89.127.203.70` | Target DNS A-record value. |",
    "| Docker Compose | `installed` | Compose `2.40.3+ds1-0ubuntu1~24.04.1`. |",
    "| Production `.env` | `missing` | Must be created later, not in this step. |",
    "| Reverse proxy | `not installed yet` | Must wait until domain/DNS decision is complete. |",
    "| Existing container | `amnezia-awg running` | Must not be broken. |",
    "| Existing UDP port | `34503/udp active` | Must remain untouched. |",
    "| Production domain | `<pending>` | Example: `portal.example.org`. |",
    "| DNS A-record target | `89.127.203.70` | Required IPv4 target. |",
    "| Backend public model | `same-domain /api/` | Preferred model from 8.8. |",
    "| A | `<production-domain>` | `89.127.203.70` | provider default or `300` | Required before HTTPS validation. |",
    "Do not configure secrets in this document.",
    "- A-record resolves to `89.127.203.70`.",
    "- Port `80` may be closed until reverse proxy is installed.",
    "- Port `443` may be closed until reverse proxy is installed.",
    "- AAAA may be absent unless IPv6 is intentionally configured.",
    "| Reverse proxy choice confirmed | `Caddy recommended` | From 8.8. |",
    "| HTTPS entrypoint can be configured | `<pending>` | Only after DNS verification. |",
    "| Existing `amnezia-awg` preserved | `required` | Must remain untouched. |",
    "- Production domain placeholder is documented.",
    "- DNS A-record target `89.127.203.70` is documented.",
    "- Same-domain `/api/` backend model is documented.",
    "- Local DNS verification commands are documented.",
    "- Server-side DNS verification commands are documented.",
    "- Reverse proxy installation is blocked until DNS is verified.",
    "- Existing `amnezia-awg` and UDP `34503` preservation is documented.",
    "- No secrets are committed to Git.",
]


def read_dns_document() -> str:
    if not DNS_PATH.exists():
        raise SystemExit(
            "Required production domain DNS verification document is missing: "
            "docs/production-domain-dns-verification.md"
        )

    return DNS_PATH.read_text(encoding="utf-8")


def get_production_domain_dns_verification_diagnostics(dns_text: str) -> dict[str, object]:
    missing_sections = [section for section in REQUIRED_SECTIONS if section not in dns_text]
    missing_source_documents = [document for document in REQUIRED_SOURCE_DOCUMENTS if f"`{document}`" not in dns_text]
    missing_table_items = [item for item in REQUIRED_TABLE_ITEMS if item not in dns_text]
    missing_commands = [command for command in REQUIRED_COMMANDS if command not in dns_text]
    missing_markers = [marker for marker in REQUIRED_MARKERS if marker not in dns_text]

    return {
        "requiredReleaseTag": REQUIRED_RELEASE_TAG,
        "requiredReleaseCommit": REQUIRED_RELEASE_COMMIT,
        "requiredStage7Commit": REQUIRED_STAGE7_COMMIT,
        "requiredStage8Checkpoint": REQUIRED_STAGE8_CHECKPOINT,
        "missingSections": missing_sections,
        "missingSourceDocuments": missing_source_documents,
        "missingTableItems": missing_table_items,
        "missingCommands": missing_commands,
        "missingMarkers": missing_markers,
        "ok": not missing_sections
        and not missing_source_documents
        and not missing_table_items
        and not missing_commands
        and not missing_markers,
    }


def main() -> None:
    diagnostics = get_production_domain_dns_verification_diagnostics(read_dns_document())

    for key in [
        "missingSections",
        "missingSourceDocuments",
        "missingTableItems",
        "missingCommands",
        "missingMarkers",
    ]:
        if diagnostics[key]:
            print(f"Production domain DNS verification diagnostics: {key}:")
            for item in diagnostics[key]:
                print(f" - {item}")

    if not diagnostics["ok"]:
        raise SystemExit(1)

    print(
        "production domain DNS verification diagnostics passed: "
        f"tag={diagnostics['requiredReleaseTag']}, "
        f"sections={len(REQUIRED_SECTIONS)}, "
        f"source_documents={len(REQUIRED_SOURCE_DOCUMENTS)}, "
        f"table_items={len(REQUIRED_TABLE_ITEMS)}, "
        f"commands={len(REQUIRED_COMMANDS)}, "
        f"markers={len(REQUIRED_MARKERS)}"
    )


if __name__ == "__main__":
    main()
