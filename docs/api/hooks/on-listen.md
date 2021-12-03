---
tableOfContents: true
---

# onListen

## Introduction

The `onListen` hook is called after the server is started and accepts connections. It should return a Promise.

## Hook payload

The `data` passed to the `onListen` hook has the following attributes:

```typescript
const data = {
  port: number,
}
```

## Example

```typescript
import { Server } from '@hocuspocus/server'

const hocuspocus = Server.configure({
  async onListen(data) {
    // Output some information
    process.stdout.write(`Server is listening on port "${data.port}"!`)
  },
})

hocuspocus.listen()
```
