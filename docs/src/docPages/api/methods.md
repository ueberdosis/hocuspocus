# Methods

## toc

## Introduction
Our goal: Let’s keep it simple. The server has a few methods only.

## Available methods
| Method                                                       | Description                                       |
| ------------------------------------------------------------ | ------------------------------------------------- |
| `listen()`                                                   | Start the server.                                 |
| `configure(configuration)`                                   | Pass custom settings.                             |
| `handleConnection(incoming, request, documentName, context)` | Bind the server to an existing server instance.   |
| `closeConnection(documentName?)`                             | Close all connections, or to a specific document. |
| `destroy()`                                                  | Stop the server.                                  |

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
