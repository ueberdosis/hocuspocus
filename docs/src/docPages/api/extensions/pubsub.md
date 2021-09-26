# PubSub

## toc

## Introduction

This extension allows horizontal scaling of Hocuspocus instances, allowing any
client to connect to any instance and share document state between them.

## Installation

Install the Throttle package with:

```bash
# with npm
npm install @hocuspocus/extension-pubsub

# with Yarn
yarn add @hocuspocus/extension-pubsub
```

## Configuration

```js
import { Server } from '@hocuspocus/server'
import { PubSub } from '@hocuspocus/extension-pubsub'

const server = Server.configure({
  extensions: [
    new PubSub({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      onPersist: async (doc) => {
        // write doc to database here
      }
    }),
  ],
})

server.listen()
```
