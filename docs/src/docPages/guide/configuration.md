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

### throttling

hocuspocus throttles connection attempts and bans ip-addresses if it crosses the configured threshold.

The threshold defaults to `15` connection attempts per `1 minute` per ip-address. The time an ip-address will be banned defaults to `5 minutes`:

```typescript
import { Server } from '@hocuspocus/server'

const hocuspocus = Server.configure({
  // allows up to 15 connection attempts per ip address per minute.
  // set to null or false to disable throttling
  throttle: 15,
  // bans ip addresses for 5 minutes after reaching the threshold
  banTime: 5,
})

hocuspocus.listen()
```
