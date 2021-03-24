# Methods

## toc

## Introduction

hocuspocus offers several methods to interact with it.

## List of available methods

### configure

Configure your server:

```js
import { Server } from '@hocuspocus/server'

const hocuspocus = Server.configure({
  // your config
})
```

### listen

Start listening on the configured port.

```js
import { Server } from '@hocuspocus/server'

const hocuspocus = Server

hocuspocus.listen()
```

### destroy

Destroy and shutdown the server.

```js
import { Server } from '@hocuspocus/server'

const hocuspocus = Server

hocuspocus.listen()
hocuspocus.destroy()
```

### handleConnection

Handle an incoming websocket connection.

```typescript
import WebSocket from 'ws'
import { IncomingMessage } from 'http'
import { Server } from '@hocuspocus/server'

const hocuspocus = Server

hocuspocus.handleConnection(<Websocket> websocket, <IncomingMessage> request, <any> context)
```
