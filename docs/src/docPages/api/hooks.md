# Hooks

## toc

## Introduction
Hooks are a core concept to control the behaviour and data flow of the server. All hooks are async. That means you can even do things like executing API requests, running DB queries, trigger webhooks or whatever you need to do to integrate it into your application.

If a user isn’t allowed to connect: Just send `reject()` in the `onConnect()` hook. Nice, isn’t it?

## Available hooks

| Hook             | Description                               | Link                                     |
| ---------------- | ----------------------------------------- | ---------------------------------------- |
| `onConnect`      | When a connection is established          | [Read more](/api/hooks/on-connect)       |
| `onAuthenticate` | When authentication is passed             | [Read more](/api/hooks/on-authenticate)  |
| `onLoadDocument` | When a new document is created            | [Read more](/api/hooks/on-load-document) |
| `onChange`       | When a document has changed               | [Read more](/api/hooks/on-change)        |
| `onDisconnect`   | When a connection was closed              | [Read more](/api/hooks/on-disconnect)    |
| `onListen`       | When the serer is intialized              | [Read more](/api/hooks/on-listen)        |
| `onDestroy`      | When the server will be destroyed         | [Read more](/api/hooks/on-destroy)       |
| `onConfigure`    | When the server has been configured       | [Read more](/api/hooks/on-configure)     |
| `onRequest`      | When a HTTP request comes in              | [Read more](/api/hooks/on-request)       |
| `onUpgrade`      | When the WebSocket connection is upgraded | [Read more](/api/hooks/on-upgrade)       |

## Usage

```js
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  async onAuthenticate({ documentName, token }) {

    // Could be an API call, DB query or whatever …
    return axios.get('/user', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
  },
})

server.listen()
```
