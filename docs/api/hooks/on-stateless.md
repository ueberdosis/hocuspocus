---
tableOfContents: true
---

# onStateless

## Introduction

The `onStateless` hook is called after the server has received a stateless message. It should return a Promise.

## Hook payload

The `data` passed to the `onListen` hook has the following attributes:

```js
const data = {
  connection: Connection,
  documentName: string,
  document: Document,
  payload: string,
}
```

## Example

```js
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  async onStateless(data) {
    // Output some information
    console.log(`Server has received a stateless message "${data.payload}"!`)
  },
})

server.listen()
```
