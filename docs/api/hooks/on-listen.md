---
tableOfContents: true
---

# onListen

## Introduction

The `onListen` hook is called after the server is started and accepts connections. It should return a Promise.

## Hook payload

The `data` passed to the `onListen` hook has the following attributes:

```js
const data = {
  port: number,
}
```

## Example

```js
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  async onListen(data) {
    // Output some information
    console.log(`Server is listening on port "${data.port}"!`)
  },
})

server.listen()
```
