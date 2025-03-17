---
tableOfContents: true
---

# Methods

## Server

| Method                   | Description                                       |
|--------------------------|---------------------------------------------------|
| `listen(port, callback)` | Start the server.                                 |
| `destroy()`              | Stop the server.                                  |

```js
import { Server } from "@hocuspocus/server";

// Configure …
const server = new Server({
  port: 1234,
});

// Listen …
server.listen();

// Destroy …
server.destroy();
```

## Hocuspocus

| Method                                         | Description                                       |
|------------------------------------------------|---------------------------------------------------|
| `configure(configuration)`                     | Pass custom settings.                             |
| `handleConnection(incoming, request, context)` | Bind the server to an existing server instance.   |
| `getDocumentsCount()`                          | Get the total number of active documents          |
| `getConnectionsCount()`                        | Get the total number of active connections        |
| `closeConnections(documentName?)`              | Close all connections, or to a specific document. |
| `openDirectConnection(documentName, context)`  | Creates a local connection to a document.         |
