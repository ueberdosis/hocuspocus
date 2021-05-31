# Methods

## toc

## Introduction
Our goal: Let’s keep it simple. The server has four methods in total. That’s enough to pass a custom configuration, start the server, stop the server or bind it to an existing WebSocket server.

## Available methods

| Method                                                       | Description                                     |
| ------------------------------------------------------------ | ----------------------------------------------- |
| `configure(configuration)`                                   | Pass custom settings.                           |
| `listen()`                                                   | Start the server.                               |
| `destroy()`                                                  | Stop the server.                                |
| `handleConnection(incoming, request, documentName, context)` | Bind the server to an existing server instance. |

## Usage

```js
import { Server } from '@hocuspocus/server'

// Configure …
const server = Server.configure({
  port: 1234,
})

// Listen …
server.listen()

// Destroy …
server.destroy()
```
