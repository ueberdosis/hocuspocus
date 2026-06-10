# @hocuspocus/extension-webhook
[![Version](https://img.shields.io/npm/v/@hocuspocus/extension-webhook.svg?label=version)](https://www.npmjs.com/package/@hocuspocus/extension-webhook)
[![Downloads](https://img.shields.io/npm/dm/@hocuspocus/extension-webhook.svg)](https://npmcharts.com/compare/tiptap?minimal=true)
[![License](https://img.shields.io/npm/l/@hocuspocus/extension-webhook.svg)](https://www.npmjs.com/package/@hocuspocus/extension-webhook)
[![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub)](https://github.com/sponsors/ueberdosis)

Send HTTP webhooks for [Hocuspocus](https://github.com/ueberdosis/hocuspocus) document lifecycle events — document changes, connects, disconnects, and creation. Lets you integrate the collaboration backend with your own services (search indexing, audit logs, downstream data pipelines) without writing a custom extension.

## Installation

```bash
npm install @hocuspocus/extension-webhook
```

## Usage

```js
import { Server } from "@hocuspocus/server"
import { Webhook, Events } from "@hocuspocus/extension-webhook"

const server = new Server({
  extensions: [
    new Webhook({
      url: "https://example.com/hocuspocus-webhook",
      secret: "your-signing-secret",
      events: [Events.onChange, Events.onConnect, Events.onDisconnect, Events.onCreate],
    }),
  ],
})

server.listen()
```

Requests are signed with HMAC-SHA256 using your `secret`, sent in the `X-Hocuspocus-Signature-256` header so the receiver can verify authenticity.

`onChange` events are debounced (default `2000ms`, max wait `10000ms`) to avoid a request per keystroke — tune with the `debounce` and `debounceMaxWait` options.

## Documentation

Payload shapes, signature verification, and debounce tuning: [tiptap.dev/docs/hocuspocus/server/extensions/webhook](https://tiptap.dev/docs/hocuspocus/server/extensions/webhook).

## License

MIT — see [LICENSE.md](https://github.com/ueberdosis/hocuspocus/blob/main/LICENSE.md).
