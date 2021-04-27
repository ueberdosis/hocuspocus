# hocuspocus (Sponsors preview)
A plug & play collaboration backend based on [Y.js](https://github.com/yjs/yjs), a CRDT framework with a powerful abstraction of shared data.

[![Build Status](https://github.com/ueberdosis/hocuspocus/workflows/build/badge.svg)](https://github.com/ueberdosis/hocuspocus/actions)
[![Version](https://img.shields.io/npm/v/@hocuspocus/server.svg?label=version)](https://www.npmjs.com/package/@hocuspocus/server)
[![Downloads](https://img.shields.io/npm/dm/@hocuspocus/server.svg)](https://npmcharts.com/compare/@hocuspocus/server?minimal=true)
[![License](https://img.shields.io/npm/l/@hocuspocus/server.svg)](https://www.npmjs.com/package/@hocuspocus/server)
[![Chat](https://img.shields.io/badge/chat-on%20discord-7289da.svg?sanitize=true)](https://discord.gg/WtJ49jGshW)
[![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub)](https://github.com/sponsors/ueberdosis)

## Documentation
The full documentation is a available on [www.hocuspocus.dev](https://www.hocuspocus.dev/installation).

## Usage
The following example is a example setup you need to start a WebSocket server. By default, it’s listening on [http://127.0.0.1](http://127.0.0.1) (or prefixed with the WebSocket protocol on ws://127.0.0.1):

```js
import { Server } from '@hocuspocus/server'
import { RocksDB } from '@hocuspocus/extension-rocksdb'

const server = Server.configure({
  port: 80,

  async onConnect() {
    console.log('🔮')
  }

  extensions: [
    new RocksDB({
      path: './database',
    }),
  ],
})
```

## Community
For help, discussion about best practices, or any other conversation:

[Join the tiptap Discord Server](https://discord.gg/WtJ49jGshW)

## Contributing
Please see [CONTRIBUTING](CONTRIBUTING.md) for details.

## Contributors
[All contributors](../../contributors).

## License
The MIT License (MIT). Please see [License File](LICENSE.md) for more information.
