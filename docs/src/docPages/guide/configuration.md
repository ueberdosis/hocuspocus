# Configuration

## toc

## Introduction

hocuspocus provides a few useful options and configuring it is as easy as calling `configure` and passing it your custom configuration:

```js
import { Server } from '@hocuspocus/server'

const hocuspocus = Server.configure({
  // your config
})

hocuspocus.listen()
```

## List of available settings

### port

hocuspocus listens on port `80`. But you're free to change it to whatever port you like:

```typescript
import { Server } from '@hocuspocus/server'

const hocuspocus = Server.configure({
  port: 80,
})

hocuspocus.listen()
```

### timeout

There's a default connection timeout of `30000ms`. After this timeout non responding websocket connections are automatically terminated.

```typescript
import { Server } from '@hocuspocus/server'

const hocuspocus = Server.configure({
  timeout: 30000,
})

hocuspocus.listen()
```
