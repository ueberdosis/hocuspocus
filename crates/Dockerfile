# hocuspocus-server (Rust) — build from the repository root:
#
#   docker build -f crates/Dockerfile -t hocuspocus-server .
#   docker run -p 1234:1234 -e HOCUSPOCUS_SERVER__LISTEN=0.0.0.0:1234 hocuspocus-server
#
# Multi-stage: a musl (fully static) release build on Alpine, shipped in a
# minimal Alpine runtime. Works for linux/amd64 and linux/arm64 (buildx).

FROM rust:1-alpine AS build
RUN apk add --no-cache musl-dev
WORKDIR /src
COPY Cargo.toml Cargo.lock ./
COPY crates ./crates
RUN cargo build --release -p hocuspocus-server \
	&& cp target/release/hocuspocus-server /hocuspocus-server

FROM alpine:3
RUN apk add --no-cache curl \
	&& addgroup -S hocuspocus && adduser -S hocuspocus -G hocuspocus
USER hocuspocus
COPY --from=build /hocuspocus-server /usr/local/bin/hocuspocus-server

ENV HOCUSPOCUS_SERVER__LISTEN=0.0.0.0:1234
EXPOSE 1234
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s \
	CMD curl -sf "http://127.0.0.1:${HOCUSPOCUS_SERVER__LISTEN##*:}/healthz" || exit 1

ENTRYPOINT ["hocuspocus-server"]
