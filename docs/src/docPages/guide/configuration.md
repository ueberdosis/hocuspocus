# Configuration

## toc

hocuspocus provides a few different configuration options. It's as simple as calling the `configure` method on it.

## List of available settings

### debounce

By default hocuspocus debounces changes on a document with a delay of 1000ms until triggering the onChange hook. There's also a maximum time (default 10000ms) after that this hook will always be triggered. Both can be configured:

```typescript
import { Server } from '@hocuspocus/server'

const hocuspocus = Server.configure({
  debounce: 1000,
  debounceMaxWait: 10000,
})

hocuspocus.listen()
```

### port

By default hocuspocus listens on port 80. But you're free to change it to whatever port you like:

```typescript
import { Server } from '@hocuspocus/server'

const hocuspocus = Server.configure({
  port: 80,
})

hocuspocus.listen()
```

### timeout

By default hocuspocus has a connection timeout of 30000ms (= 30s). After this timeout non responding websocket connections are automatically terminated.

```typescript
import { Server } from '@hocuspocus/server'

const hocuspocus = Server.configure({
  timeout: 30000,
})

hocuspocus.listen()
```
