# onDestroy

## toc

## Introduction

The `onDestroy` hook is called after the server was shut down using the [destroy](/api/methods) method. It should return a Promise.

## Hook payload

The `data` passed to the `onDestroy` hook has the following attributes:

```typescript
const data = {
  instance: Hocuspocus
}
```

## Example

```typescript
import { Server } from '@hocuspocus/server'

const hocuspocus = Server.configure({
  async onDestroy(data) {
    // Output some information
    process.stdout.write(`Server was shut down!`)
  }
})

hocuspocus.listen()
```
