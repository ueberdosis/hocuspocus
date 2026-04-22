# @hocuspocus/extension-sqlite
[![Version](https://img.shields.io/npm/v/@hocuspocus/extension-sqlite.svg?label=version)](https://www.npmjs.com/package/@hocuspocus/extension-sqlite)
[![Downloads](https://img.shields.io/npm/dm/@hocuspocus/extension-sqlite.svg)](https://npmcharts.com/compare/tiptap?minimal=true)
[![License](https://img.shields.io/npm/l/@hocuspocus/extension-sqlite.svg)](https://www.npmjs.com/package/@hocuspocus/extension-sqlite)
[![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub)](https://github.com/sponsors/ueberdosis)

Persist [Hocuspocus](https://github.com/ueberdosis/hocuspocus) documents to a local SQLite database. Zero-config storage for development, self-hosted single-instance deployments, and small production setups. Uses [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3).

## Installation

```bash
npm install @hocuspocus/extension-sqlite
```

## Usage

```js
import { Server } from "@hocuspocus/server"
import { SQLite } from "@hocuspocus/extension-sqlite"

const server = new Server({
  extensions: [
    new SQLite({ database: "db.sqlite" }),
  ],
})

server.listen()
```

`database` accepts:
- a filename (persisted to disk, e.g. `"db.sqlite"`)
- `":memory:"` for an in-memory database
- `""` for an anonymous on-disk database

Omit the option entirely to default to `":memory:"`.

## Troubleshooting

### `Could not locate the bindings file`

`better-sqlite3` ships prebuilt native addons, but they don't always cover the newest Node.js release on day one. Rebuild from source in your server project:

```bash
npm rebuild better-sqlite3 --build-from-source
```

Needs a C++ toolchain (Xcode Command Line Tools on macOS, `build-essential` on Debian/Ubuntu, Visual Studio Build Tools on Windows).

## Documentation

Schema, custom `fetch`/`store`, and migration guides: [tiptap.dev/docs/hocuspocus/server/extensions/sqlite](https://tiptap.dev/docs/hocuspocus/server/extensions/sqlite).

## License

MIT — see [LICENSE.md](https://github.com/ueberdosis/hocuspocus/blob/main/LICENSE.md).
