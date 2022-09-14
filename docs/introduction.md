# Introduction

[![Version](https://img.shields.io/npm/v/@hocuspocus/server.svg?label=version)](https://www.npmjs.com/package/@hocuspocus/server)
[![Downloads](https://img.shields.io/npm/dm/@hocuspocus/server.svg)](https://npmcharts.com/compare/@hocuspocus/server?minimal=true)
[![License](https://img.shields.io/npm/l/@hocuspocus/server.svg)](https://www.npmjs.com/package/@hocuspocus/server)
[![Chat](https://img.shields.io/badge/chat-on%20discord-7289da.svg?sanitize=true)](https://discord.gg/WtJ49jGshW)

Hocuspocus is a suite of tools to bring collaboration to your application. It’s based
on [Y.js](https://github.com/yjs/yjs) (by Kevin Jahns), which is amazing to sync and merge changes
from clients in real-time. But you can also use it to build offline-first apps, and sync changes
later. We’ll make sure to resolve conflicts and keep everything in sync, always.

## What is Y.js?

Y.js merges changes from users without conflicts and in real-time. Compared to other
implementations, it is super performant and “kicks the pants off” (Joseph Gentle, Ex-Google Wave
Engineer, [source](https://josephg.com/blog/crdts-are-the-future/)).

For such a Conflict-free Replication Data Type (CRDT), it doesn’t matter in which order changes are
applied. It’s a little bit like Git, where it doesn’t matter when changes are committed. Also, every
copy of the data is worth the same.

This enables you to build performant real-time applications, add collaboration to your existing app,
sync awareness states and think offline-first.

## The Hocuspocus Server

With Y.js, you can use whatever network protocol you like to send changes to other clients, but the
most popular one is a WebSocket. The Hocuspocus Server is a WebSocket backend, which has everything
to get started quickly, to integrate Y.js in your existing infrastructure and to scale to a million
users.

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

The two code examples below show a working example of the backend *and* frontend to sync an array
with multiple users. We have also added some examples in the `playground` folder of the
repo (https://github.com/ueberdosis/hocuspocus/tree/main/playground), that you can start by
running `npm run playground` in the repository root. They are meant for internal usage during hocuspocus
development, but they might be useful to understand how everything can be used.

### Backend

```js
import {Hocuspocus} from '@hocuspocus/server'

// Configure the server …
const server = new Hocuspocus({
  port: 1234,
})

// … and run it!
server.listen()
```

### Frontend

```js
import * as Y from 'yjs'
import {HocuspocusProvider} from '@hocuspocus/provider'


// Connect it to the backend
const provider = new HocuspocusProvider({
  url: 'ws://127.0.0.1:1234',
  name: 'example-document',
})

// Define `tasks` as an Array
const tasks = provider.document.getArray('tasks')

// Listen for changes
tasks.observe(() => {
  console.log('tasks were modified')
})

// Add a new task
tasks.push(['buy milk'])
```
