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

### debounce

By default, hocuspocus debounces changes on a document with a delay of `1000ms` until triggering the [onChange hook](/guide/documents) and thus for example save changes. This doesn't affect the synchronization between clients: this will always be instantaneous. There's also a maximum wait time that defaults to `10000ms`, so even if someone is typing continuously changes will be saved by default every 10 seconds. Both can be configured:

```typescript
import { Server } from '@hocuspocus/server'

const hocuspocus = Server.configure({
  debounce: 1000,
  debounceMaxWait: 10000,
})

hocuspocus.listen()
```

### external

If set to `true`, hocuspocus will not start a WebSocket server itself but rather handles connections by calling the `handleConnection()` method manually. This way, you yan use it with your existing WebSocket server or framework. Check out the [framework integration](/guide/framework-integration) section of the guide for more information.

```typescript
import { Server } from '@hocuspocus/server'

const hocuspocus = Server.configure({
  external: true,
})
```
