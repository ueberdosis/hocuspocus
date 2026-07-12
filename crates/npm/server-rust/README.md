# @hocuspocus/server-rust

The [Hocuspocus](https://hocuspocus.dev) server, rewritten in Rust — 100%
wire-compatible with `@hocuspocus/provider`. This package installs the
prebuilt `hocuspocus-server` binary for your platform (via optional
dependencies, like esbuild) and exposes it as a `hocuspocus-server` bin.

```bash
npm install @hocuspocus/server-rust
npx hocuspocus-server
```

Configuration is TOML + `HOCUSPOCUS_*` environment variables (double
underscore nests sections, e.g. `HOCUSPOCUS_SERVER__LISTEN=0.0.0.0:1234`).
Application logic — authentication, persistence, lifecycle events — is
delegated over signed HTTP webhooks. See `crates/RFC.md` (architecture and
webhook contract) and `crates/MIGRATION.md` (moving from
`@hocuspocus/server`) in the repository.

Programmatic use:

```js
import { binaryPath } from "@hocuspocus/server-rust";
// Absolute path of the platform binary; honors HOCUSPOCUS_RUST_BIN.
```

Supported platforms: Linux x64 (glibc + musl), Linux arm64 (glibc),
macOS x64/arm64, Windows x64. On anything else, build from source
(`cargo build --release -p hocuspocus-server`) and set
`HOCUSPOCUS_RUST_BIN` to the produced binary.
