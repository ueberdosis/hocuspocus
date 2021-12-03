---
tableOfContents: true
---

# Configuration

## Introduction

hocuspocus provides a few useful options and configuring it is as easy as calling `configure` and passing it your custom configuration:

```js
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  // your config
})

server.listen()
```

## List of available settings

### port

hocuspocus listens on port `80`. But you're free to change it to whatever port you like:

```js
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  port: 80,
})

server.listen()
```

### timeout

There's a default connection timeout of `30000ms`. After this timeout non responding websocket connections are automatically terminated.

```js
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  timeout: 30000,
})

server.listen()
```
