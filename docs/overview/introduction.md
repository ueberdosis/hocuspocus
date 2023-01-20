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

- Merges changes without conflicts
- Doesn’t care when changes come in
- Can sync your whole application state
- Collaborative text editing (with Tiptap, Slate, Quill, Monaco or ProseMirror)
- Integrates into existing applications
- Sends changes to Webhooks
- Scales to millions of users with Redis
- Written in TypeScript
