---
tableOfContents: true
---

# onConfigure

## Introduction
The `onConfigure` hook is called after the server was configured using the [configure](/api/methods) method. It should return a Promise.

## Default configuration
If `configure()` is never called, you can get the default configuration by importing it:

```js
import { defaultConfiguration } from '@hocuspocus/server'
```

## Hook payload
The `data` passed to the `onConfigure` hook has the following attributes:

```js
import { Configuration } from '@hocuspocus/server'

const data = {
  configuration: Configuration,
  version: string,
  yjsVersion: string,
  instance: Hocuspocus,
}
```

## Example
```js
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  async onConfigure(data) {
    // Output some information
    console.log(`Server was configured!`)
  },
})

server.listen()
```
