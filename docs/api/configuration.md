---
tableOfContents: true
---

# Configuration

## Introduction
There’s only two settings to pass for now: A custom port and a connection timeout. Most things are controlled through [hooks](/api/hooks).

## Settings

### name
A name for the instance, used for logging.

### port
The port the server should listen on.

Default: `80`

### timeout
A connection healthcheck interval in milliseconds.

Default: `30000`

### quiet
By default, the servers show a start screen. If passed false, the server will start quietly.

Default: `false`

## Usage

```js
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  name: 'hocuspocus-fra1-01',
  port: 1234,
  timout: 30000,
  quiet: true,
})

server.listen()
```
