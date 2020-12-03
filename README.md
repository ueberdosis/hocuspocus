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
  persistence: new LevelDB({
    path: './database',
  }),
})

server.listen()
```

### Authentication
Add a callback to authenticate your users. You can query a database, request a REST API GraphQL API, whatever you need to do. Just make sure to call `resolve()` when the user is allowed to connect, and `reject()` if the user isn’t allowed to connect to the server.

```js
import { Server } from '@hocuspocus/server'
import { LevelDB } from '@hocuspocus/leveldb'

const server = Server.configure({
  onConnect(data, resolve, reject) {
    const { requestHeaders } = data

    // Authenticate using request headers
    // if (requestHeaders.access_token !== 'super-secret-token') {
    //   return reject()
    // }

    // Set context for later usage (optional)
    const context = {
      user_id: 1234,
    }

    resolve(context)
  },
})

server.listen()
```

### Authorization
Add a callback to check if a user can access a specific document. You have access to a previously set context, but you can also query the database or send an API request here. Call `resolve()` when the user is authorized, and `reject()` if the user isn’t allowed to access the document.

```js
import { Server } from '@hocuspocus/server'
import { LevelDB } from '@hocuspocus/leveldb'

const server = Server.configure({
  onJoinDocument(data, resolve, reject) {
    const {
      clientsCount,
      context,
      document,
      documentName,
      requestHeaders,
    } = data

    // Check the context (or whatever you want to do)
    if (context.user_id !== 1234) {
      // Unauthorized
      return reject()
    }

    // Authorized
    resolve()
  },
})

server.listen()
```

## Changes
You can store changed documents in a database, a REST API, a GraphQL API or wherever you want. The `onChange()` callback enables you to control where you documents should be stored.

While the LevelDB persistence is needed to store all changes that are ever made to the document, the `onChange()` callback has the current state of the document.

With the `debounce` setting you can make sure the callback won’t be executed to often. With the `debounceMaxWait` setting you can make sure the callback is executed at least after a specified amount of milliseconds, even if the document changes constantly.

```js
import { Server } from '@hocuspocus/server'
import { LevelDB } from '@hocuspocus/leveldb'

const server = Server.configure({
  debounce: 2000, // or true/false
  debounceMaxWait: 10000,
  onChange(data) {
    const {
      clientsCount,
      document,
      documentName,
      requestHeaders,
    } = data

    // handle
  },
})

server.listen()
```

## Documentation
Read more about collaborative editing with tiptap, the configuration of the server and everything you need to know in [the official tiptap documentation](https://next.tiptap.dev/guide/collaborative-editing).

## Development
1. Install dependencies with `$ yarn install`
2. Start the development server `$ yarn start:development`

## Tasks
- [ ] Add Redis support
- [ ] Connect with existing express instance
- [ ] Get server instance from hocuspocus
- [ ] Test with a dummy Laravel application?
- [ ] Support for level DB meta data?
- [ ] TypeScript
- [ ] Write tests?

## Questions
- How do you back up LevelDB folders?
- Can users join/leave documents without closing the connection?
- How would that work with a read-only mode? Any chance, the server would broadcast changes, but won’t accept changes from specific clients?

## 💖 Sponsor the development
Are you using tiptap in production? We need your sponsorship to maintain, update and develop tiptap. [Become a Sponsor now!](https://github.com/sponsors/ueberdosis)

## License
The MIT License (MIT). Please see [License File](LICENSE.md) for more information.
