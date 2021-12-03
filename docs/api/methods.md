---
tableOfContents: true
---

# Methods

## Introduction
Our goal: Let’s keep it simple. The server has a few methods only.

## Methods

### listen(portOrCallback, callback)
Start the server.

```js
server.listen()
server.listen(8080)
server.listen(8080, () => {
  console.log('Ready.')
})
server.listen(() => {
  console.log('Ready.')
})
```

### configure(configuration)
Pass custom settings.

```js
server.configure({
  port: 8080,
})
```

### handleConnection(incoming, request, documentName, context)
Bind the server to an existing server instance.

### getDocumentsCount()
Get the total number of active documents

### getConnectionsCount()
Get the total number of active connections

### closeConnections(documentName?)
Close all connections, or to a specific document.

### destroy()
Stop the server.

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
