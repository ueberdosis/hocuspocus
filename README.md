# hocuspocus
[![Version](https://img.shields.io/npm/v/@hocuspocus/server.svg?label=version)](https://www.npmjs.com/package/hocuspocustserver-server)
[![Downloads](https://img.shields.io/npm/dm/@hocuspocus/server.svg)](https://npmcharts.com/compare/@hocuspocus/server?minimal=true)
[![License](https://img.shields.io/npm/l/@hocuspocus/server.svg)](https://www.npmjs.com/package/@hocuspocus/server)
[![Build Status](https://github.com/ueberdosis/hocuspocus/workflows/build/badge.svg)](https://github.com/ueberdosis/hocuspocus/actions)
[![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub)](https://github.com/sponsors/ueberdosis)

hocuspocus is an opinionated collaborative editing backend for [tiptap](https://github.com/ueberdosis/tiptap) – based on [Y.js](https://github.com/yjs/yjs), a CRDT framework with a powerful abstraction of shared data.

## Installation

```bash
yarn add @hocuspocus/server
```

## Usage

### Simple
The following example is the bare minimum you need to start a WebSocket server. By default, it’s listening on [http://127.0.0.1](http://127.0.0.1) (or with the WebSocket protocol on ws://127.0.0.1):

```js
import { Server } from '@hocuspocus/server'

Server.listen()
```

### Configuration
You can pass a configuration to control how the WebSocket server should behave. Let’s assume you want the server to listen on a different port:

```js
import { Server } from '@hocuspocus/server'

const server = Server.create({
  port: 1234,
})

server.listen()
```

### Persistence
By default, the server stores all documents in the memory. If you stop the server, the documents will be lost. To persist documents, you can pass a persistence driver, for example LevelDB (which stores the documents in a specified folder). Install the LevelDB persistence driver:

```bash
yarn add @hocuspocus/leveldb
```

And pass it to the collaboration server:
```js
import { Server } from '@hocuspocus/server'
import { LevelDB } from '@hocuspocus/leveldb'

const server = Server.configure({
  port: 1234,

  persistence: new LevelDB({
    path: './database',
  }),
})

server.listen()
```

## Documentation
Read more about collaborative editing with tiptap, the configuration of the server and everything you need to know in [the official tiptap documentation](https://next.tiptap.dev/guide/collaborative-editing).

## Development
1. Install dependencies with `$ yarn install`
2. Start the development server `$ yarn start:development`

## Tasks
### Required
- [ ] Publish on npm
- [ ] Create new repository in GitLab for the tiptap documentation example server (e. g. `hocuspocus-demo`)
- [ ] Add Docker Setup
- [ ] Create a Node.js template from that setup
- [ ] Deploy demo to Servivum

### Optional
- [ ] Authorization hooks
- [ ] Connect with existing express instance
- [ ] Get server instance from hocuspocus
- [ ] HTTP Callbacks
- [ ] Add Redis support
- [ ] Test with a dummy Laravel application?
- [ ] Support for level DB meta data?
- [ ] TypeScript
- [ ] Write tests?

## Questions
- Are documents persisted if the server crashes?
- How do you back up LevelDB folders?

## 💖 Sponsor the development
Are you using tiptap in production? We need your sponsorship to maintain, update and develop tiptap. [Become a Sponsor now!](https://github.com/sponsors/ueberdosis)

## License
The MIT License (MIT). Please see [License File](LICENSE.md) for more information.
