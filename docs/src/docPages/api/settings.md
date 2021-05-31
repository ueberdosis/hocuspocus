# Settings

## toc

## Introduction
There’s only two settings to pass for now: A custom port and a connection timout. Most things are controlled through [hooks](/api/hooks).

## Available settings
| Setting   | Default | Description                                        |
| --------- | ------- | -------------------------------------------------- |
| `port`    | `80`    | The port the server should listen on.              |
| `timeout` | `30000` | A connection healthcheck interval in milliseconds. |

## Usage

```js
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  port: 1234,
  timout: 30000,
})

server.listen()
```
