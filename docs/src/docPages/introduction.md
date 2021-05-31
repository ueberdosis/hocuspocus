# hocuspocus
[![Version](https://img.shields.io/npm/v/@hocuspocus/server.svg?label=version)](https://www.npmjs.com/package/@hocuspocus/server)
[![Downloads](https://img.shields.io/npm/dm/@hocuspocus/server.svg)](https://npmcharts.com/compare/@hocuspocus/server?minimal=true)
[![License](https://img.shields.io/npm/l/@hocuspocus/server.svg)](https://www.npmjs.com/package/@hocuspocus/server)
[![Chat](https://img.shields.io/badge/chat-on%20discord-7289da.svg?sanitize=true)](https://discord.gg/WtJ49jGshW)

A plug & play collaboration backend based on [Y.js](https://github.com/yjs/yjs).

## Features
* Merges changes without conflicts
* Doesn’t care when changes come in
* Can sync your whole application state
* Collaborative editing with tiptap, Slate, Quill and many more
* Integrates into existing applications
* Redirects changes to Webhooks
* Scales to millions of users with Redis
* Officially part of the Y.js collective
* Written in TypeScript

## Usage
```js
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  port: 1234,
})

server.listen()
```

