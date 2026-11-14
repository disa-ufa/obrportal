from __future__ import annotations

import re
import shlex
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DOCKERFILE = ROOT / "frontend" / "Dockerfile.prod"
NGINX_CONF = ROOT / "frontend" / "nginx.conf"
LOCKFILE = ROOT / "frontend" / "package-lock.json"


DOCKERFILE_MARKERS = [
    "FROM node:22-alpine AS build",
    "WORKDIR /app",
    "COPY package*.json ./",
    "COPY . .",
    "RUN npm run build",
    "FROM nginx:1.27-alpine",
    "COPY nginx.conf /etc/nginx/conf.d/default.conf",
    "COPY --from=build /app/dist /usr/share/nginx/html",
    "EXPOSE 5173",
    "HEALTHCHECK",
]

NGINX_MARKERS = [
    "listen 5173;",
    "root /usr/share/nginx/html;",
    "index index.html;",
    "location = /healthz",
    "default_type text/plain;",
    'return 200 "ok\\n";',
    "location /assets/",
    "try_files $uri =404;",
    'add_header Cache-Control "public, immutable";',
    "location /",
    "try_files $uri $uri/ /index.html;",
]


def require_file(path: Path) -> str:
    if not path.exists():
        raise SystemExit(f"missing required file: {path.relative_to(ROOT)}")

    return path.read_text(encoding="utf-8")


def require_markers(label: str, text: str, markers: list[str]) -> None:
    missing = [marker for marker in markers if marker not in text]

    if missing:
        print(f"{label} diagnostics failed")
        print("missing markers:")
        for marker in missing:
            print(f" - {marker}")
        raise SystemExit(1)


def require_locked_install(dockerfile_text: str) -> None:
    # Match an active instruction, not a comment or a command that masks failure.
    if not any(re.fullmatch(r"RUN\s+npm\s+ci(?:\s+--(?:no-audit|no-fund))*", line.strip())
               for line in dockerfile_text.splitlines()):
        raise SystemExit("frontend production Dockerfile requires RUN npm ci")


def require_api_proxy(nginx_text: str) -> None:
    """Allow the internal API route while keeping all other locations static."""
    lexer = shlex.shlex(nginx_text, posix=False, punctuation_chars="{};")
    lexer.whitespace_split = True
    scopes, blocks, directives, statement = [], [], [], []
    try:
        for group in lexer:
            tokens = list(group) if all(char in "{};" for char in group) else [group]
            for token in tokens:
                if token == "{":
                    if not statement:
                        raise ValueError("block without a name")
                    scopes.append(tuple(statement))
                    blocks.append(tuple(scopes))
                    statement = []
                elif token == "}":
                    if statement or not scopes:
                        raise ValueError("unbalanced block or missing semicolon")
                    scopes.pop()
                elif token == ";":
                    if not statement:
                        raise ValueError("empty directive")
                    directives.append((tuple(scopes), tuple(statement)))
                    statement = []
                else:
                    statement.append(token)
        if scopes or statement:
            raise ValueError("unfinished nginx configuration")
    except ValueError as exc:
        raise SystemExit(f"frontend nginx config parse failed: {exc}") from exc

    api_scope = (("server",), ("location", "/api/"))
    scan_scope = (
        ("server",),
        ("location", "~",
         "^/api/v1/admin/mintrud/protocol-drafts/[^/]+/signed-scan$"),
    )
    upstream = ("proxy_pass", "http://backend:8000")

    proxies = [
        (scope, directive)
        for scope, directive in directives
        if directive[0] == "proxy_pass"
    ]

    expected = {
        (api_scope, upstream),
        (scan_scope, upstream),
    }

    if (
        blocks.count(api_scope) != 1
        or blocks.count(scan_scope) != 1
        or len(proxies) != 2
        or set(proxies) != expected
    ):
        raise SystemExit(
            "frontend nginx permits only /api/ and exact "
            "signed-scan proxy to internal backend"
        )

    limits = [
        (scope, directive)
        for scope, directive in directives
        if directive[0] == "client_max_body_size"
    ]

    if limits != [
        (scan_scope, ("client_max_body_size", "10551296"))
    ]:
        raise SystemExit(
            "signed-scan body limit must be exact and isolated"
        )

    for scope in (api_scope, scan_scope):
        for header, value in [
            ("Host", "$host"),
            ("X-Forwarded-Proto", "$scheme"),
            ("X-Forwarded-For", "$proxy_add_x_forwarded_for"),
        ]:
            target = (
                scope, ("proxy_set_header", header, value)
            )
            actual = [
                (s, directive)
                for s, directive in directives
                if s == scope
                and directive[:2] == ("proxy_set_header", header)
            ]
            if actual != [target]:
                raise SystemExit(
                    f"frontend nginx proxy header invalid: {header}"
                )

def main() -> None:
    dockerfile_text = require_file(DOCKERFILE)
    nginx_text = require_file(NGINX_CONF)
    require_file(LOCKFILE)

    require_markers("frontend production Dockerfile", dockerfile_text, DOCKERFILE_MARKERS)
    require_locked_install(dockerfile_text)
    require_markers("frontend nginx static config", nginx_text, NGINX_MARKERS)
    require_api_proxy(nginx_text)

    forbidden_nginx = [
        "add_header Content-Type text/plain;",
    ]

    forbidden_present = [marker for marker in forbidden_nginx if marker in nginx_text]

    if forbidden_present:
        print("frontend nginx static config diagnostics failed")
        print("forbidden markers:")
        for marker in forbidden_present:
            print(f" - {marker}")
        raise SystemExit(1)

    print(
        "frontend static serving diagnostics passed: "
        f"dockerfile_markers={len(DOCKERFILE_MARKERS)}, "
        f"nginx_markers={len(NGINX_MARKERS)}"
    )


if __name__ == "__main__":
    main()
