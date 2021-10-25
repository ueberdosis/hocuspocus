# hocuspocus
[![Version](https://img.shields.io/npm/v/@hocuspocus/server.svg?label=version)](https://www.npmjs.com/package/@hocuspocus/server)
[![Downloads](https://img.shields.io/npm/dm/@hocuspocus/server.svg)](https://npmcharts.com/compare/@hocuspocus/server?minimal=true)
[![License](https://img.shields.io/npm/l/@hocuspocus/server.svg)](https://www.npmjs.com/package/@hocuspocus/server)
[![Chat](https://img.shields.io/badge/chat-on%20discord-7289da.svg?sanitize=true)](https://discord.gg/WtJ49jGshW)

A Node.js collaboration backend based on [Y.js](https://github.com/yjs/yjs).

## What is Y.js?
Y.js merges changes from users without conflicts and in real-time. Compared to other implementations, it is super performant and “kicks the pants off” (Joseph Gentle, Ex-Google Wave Engineer, [source](https://josephg.com/blog/crdts-are-the-future/)).

For such a Conflict-free Replication Data Type (CRDT), it doesn’t matter in which order changes are applied. It’s a little bit like Git, where it doesn’t matter when changes are committed.

That enables you to build performant real-time applications, add collaboration to your existing app, sync presence states and think offline-first.

## So, what’s hocuspocus then?
You can use whatever you like to send Y.js changes to other clients, but the most popular way is to use a WebSocket. With hocuspocus you’ve got such a WebSocket backend, that has everything to get started quickly, integrate Y.js in your existing infrastructure and scale to a million users.

## Features
* Merges changes without conflicts
* Doesn’t care when changes come in
* Can sync your whole application state
* Collaborative text editing (with Tiptap, Slate, Quill, Monaco or ProseMirror)
* Integrates into existing applications
* Sends changes to Webhooks
* Scales to millions of users with Redis
* Written in TypeScript
* Part of the [Y-Collective](https://opencollective.com/y-collective), a fund for the Y.js ecosystem

## Quickstart
The two code examples below show a working example of the backend *and* frontend to sync an array with multiple users.

### Backend
```js
import { Server } from '@hocuspocus/server'

// Configure the server …
const server = Server.configure({
  port: 1234,
})

// … and run it!
server.listen()
```

### Frontend
```js
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'

// Set up a new Y.js document
const ydoc = new Y.Doc()

// Connect it to the backend
const provider = new HocuspocusProvider({
  url: 'ws://127.0.0.1:1234',
  name: 'example-document',
  document: ydoc,
})

// Define `tasks` as an Array
const tasks = ydoc.getArray('tasks')

// Listen for changes
tasks.observer(() => {
  console.log('tasks were modified')
})

// Add a new task
tasks.push(['buy milk'])
```
