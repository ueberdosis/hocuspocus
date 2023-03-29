---
tableOfContents: true
---

# beforeBroadcastStateless

## Introduction

The `beforeBroadcastStateless` hooks are called before the server broadcast a stateless message.

## Hook payload

The `data` passed to the `beforeBroadcastStateless` hook has the following attributes:

```js
import { Doc } from 'yjs'

const data = {
  documentName: string,
  document: Doc,
  payload: string,
}
```

## Example

```js
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  beforeBroadcastStateless({ payload }) {
    console.log(`Server will broadcast a stateless message: "${payload}"!`)
  },
})

server.listen()
```
