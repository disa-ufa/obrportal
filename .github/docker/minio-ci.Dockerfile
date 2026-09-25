FROM golang:1.24-alpine AS build

ARG TARGETARCH
ARG MINIO_REF=RELEASE.2025-10-15T17-29-55Z
ARG MINIO_COMMIT=9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a

RUN apk add --no-cache ca-certificates git

WORKDIR /src

RUN set -eux; \
    git clone --depth 1 --branch "${MINIO_REF}" https://github.com/minio/minio.git .; \
    test "$(git rev-parse HEAD)" = "${MINIO_COMMIT}"

RUN set -eux; \
    LDFLAGS="$(go run buildscripts/gen-ldflags.go)"; \
    CGO_ENABLED=0 \
    GOOS=linux \
    GOARCH="${TARGETARCH:-amd64}" \
    go build \
        -tags kqueue \
        -trimpath \
        --ldflags "${LDFLAGS}" \
        -o /out/minio \
        .

FROM alpine:3.22

RUN apk add --no-cache ca-certificates curl

COPY --from=build /out/minio /usr/bin/minio

EXPOSE 9000 9001

VOLUME ["/data"]

ENTRYPOINT ["/usr/bin/minio"]

CMD ["server", "/data", "--console-address", ":9001"]
