from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DOCKERFILE = ROOT / "frontend" / "Dockerfile.prod"
NGINX_CONF = ROOT / "frontend" / "nginx.conf"


DOCKERFILE_MARKERS = [
    "FROM node:22-alpine AS build",
    "WORKDIR /app",
    "COPY package*.json ./",
    "RUN npm install",
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


def main() -> None:
    dockerfile_text = require_file(DOCKERFILE)
    nginx_text = require_file(NGINX_CONF)

    require_markers("frontend production Dockerfile", dockerfile_text, DOCKERFILE_MARKERS)
    require_markers("frontend nginx static config", nginx_text, NGINX_MARKERS)

    forbidden_nginx = [
        "add_header Content-Type text/plain;",
        "proxy_pass",
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
