# @hocuspocus/extension-throttle
[![Version](https://img.shields.io/npm/v/@hocuspocus/extension-throttle.svg?label=version)](https://www.npmjs.com/package/@hocuspocus/extension-throttle)
[![Downloads](https://img.shields.io/npm/dm/@hocuspocus/extension-throttle.svg)](https://npmcharts.com/compare/tiptap?minimal=true)
[![License](https://img.shields.io/npm/l/@hocuspocus/extension-throttle.svg)](https://www.npmjs.com/package/@hocuspocus/extension-throttle)
[![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub)](https://github.com/sponsors/ueberdosis)

Rate-limit and throttle connections to a [Hocuspocus](https://github.com/ueberdosis/hocuspocus) server by IP. Protects your collaboration backend from abuse, accidental reconnect loops, and misbehaving clients.

## Installation

```bash
npm install @hocuspocus/extension-throttle
```

## Usage

With default thresholds (15 connection attempts per 60 seconds, 5 minute ban):

```js
import { Server } from "@hocuspocus/server"
import { Throttle } from "@hocuspocus/extension-throttle"

const server = new Server({
  extensions: [new Throttle()],
})

server.listen()
```

### Tune the limits

```js
new Throttle({
  throttle: 30,          // allowed connection attempts per window
  consideredSeconds: 60, // window length in seconds
  banTime: 5,            // ban duration in minutes
})
```

Pass `throttle: false` (or `null`) to effectively disable the limiter without removing the extension.

## Documentation

Full options reference: [tiptap.dev/docs/hocuspocus/server/extensions/throttle](https://tiptap.dev/docs/hocuspocus/server/extensions/throttle).

## License

MIT — see [LICENSE.md](https://github.com/ueberdosis/hocuspocus/blob/main/LICENSE.md).
