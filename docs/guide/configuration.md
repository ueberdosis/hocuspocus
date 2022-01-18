---
tableOfContents: true
---

# Configuration

## Introduction
Hocuspocus provides a few useful options and configuring it is as easy as calling `configure` and passing it your custom configuration:

```js
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  // your config
})

server.listen()
```

## List of available settings

### port
Hocuspocus listens on port `80`. But you're free to change it to whatever port you like:

```js
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  port: 1234,
})

server.listen()
```

Default: `80`

### timeout
There is a default connection timeout of `30000ms`. After this timeout non responding websocket connections are automatically terminated.

```js
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  timeout: 15000,
})

server.listen()
```

Default: `30000` (= 30s)

### debounce
Debounces the call of the `onStoreDocument` hook for the given amount of time in ms. Otherwise every single update would be persisted.

```js
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  debounce: 5000,
})

server.listen()
```

Default: `2000` (= 2s)

### maxDebounce
Makes sure to call `onStoreDocument` at least in the given amount of time (ms).

```js
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  maxDebounce: 30000,
})

server.listen()
```

Default: `10000` (= 10s)
