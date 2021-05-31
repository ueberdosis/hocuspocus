# Hooks

## toc

## Introduction
Hooks are a core concept to control the behaviour and data flow of the server. All hooks are async. That means you can even do things like executing API requests, running DB queries, trigger webhooks or whatever you need to do to integrate it into your application.

If a user isn’t allowed to connect: Just send `reject()` in the `onConnect()` hook. Nice, isn’t it?

## Available hooks

| Hook               | Description                               | Link                                 |
| ------------------ | ----------------------------------------- | ------------------------------------ |
| `onConnect`        | When a connection is established          | [Read more](/api/on-connect)         |
| `onCreateDocument` | When a new document is created            | [Read more](/api/on-create-document) |
| `onChange`         | When a document has changed               | [Read more](/api/on-change)          |
| `onDisconnect`     | When a connection was closed              | [Read more](/api/on-disconnect)      |
| `onListen`         | When the serer is intialized              | [Read more](/api/on-listen)          |
| `onDestroy`        | When the server will be destroyed         | [Read more](/api/on-destroy)         |
| `onConfigure`      | When the server has been configured       | [Read more](/api/on-configure)       |
| `onRequest`        | When a HTTP request comes in              | [Read more](/api/on-request)         |
| `onUpgrade`        | When the WebSocket connection is upgraded | [Read more](/api/on-upgrade)         |

## Usage

```js
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  async onConnect({ documentName, requestParameters }) {

    // Could be an API call, DB query or whatever …
    return axios.get('/user', {
      headers: {
        Authorization: `Bearer ${requestParameters.token}}`
      }
    })

  },
})

server.listen()
```
