---
tableOfContents: true
---

# onDestroy

## Introduction

The `onDestroy` hook is called after the server was shut down using the [destroy](/api/methods) method. It should return a Promise.

## Hook payload

The `data` passed to the `onDestroy` hook has the following attributes:

```js
const data = {
  instance: Hocuspocus
}
```

## Example

```js
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  async onDestroy(data) {
    // Output some information
    console.log(`Server was shut down!`)
  }
})

server.listen()
```
