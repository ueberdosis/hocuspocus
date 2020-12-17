# hocuspocus
[![Build Status](https://github.com/ueberdosis/hocuspocus/workflows/build/badge.svg)](https://github.com/ueberdosis/hocuspocus/actions)

hocuspocus is a plug & play collaboration backend. It’s based on [Y.js](https://github.com/yjs/yjs), a CRDT framework with a powerful abstraction of shared data.

## Installation
```bash
yarn add @hocuspocus/server
```

## Usage
The following example is the bare minimum you need to start a WebSocket server. By default, it’s listening on [http://127.0.0.1](http://127.0.0.1) (or with the WebSocket protocol on ws://127.0.0.1):

```js
import { Server } from '@hocuspocus/server'

Server.listen()
```

## Documentation
Read more about collaborative editing with tiptap, the configuration of the server and everything you need to know in [the official documentation](https://hocuspocus.dev).

## Development
1. Install dependencies with `$ yarn install`
2. Start the development server `$ yarn start:development`

## Release
TODO
