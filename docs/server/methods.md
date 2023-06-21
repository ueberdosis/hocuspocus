---
tableOfContents: true
---

# Methods

| Method                                         | Description                                       |
|------------------------------------------------|---------------------------------------------------|
| `listen(portOrCallback, callback)`             | Start the server.                                 |
| `configure(configuration)`                     | Pass custom settings.                             |
| `handleConnection(incoming, request, context)` | Bind the server to an existing server instance.   |
| `getDocumentsCount()`                          | Get the total number of active documents          |
| `getConnectionsCount()`                        | Get the total number of active connections        |
| `closeConnections(documentName?)`              | Close all connections, or to a specific document. |
| `destroy()`                                    | Stop the server.                                  |
| `openDirectConnection(documentName, context)`  | Creates a local connection to a document.         |

## Usage

```js
import {Server} from "@hocuspocus/server";

// Configure …
const server = Server.configure({
  port: 1234,
});

// Listen …
server.listen();

// Destroy …
server.destroy();
```
