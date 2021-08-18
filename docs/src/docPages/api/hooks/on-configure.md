# onConfigure

## toc

## Introduction

The `onConfigure` hook is called after the server was configured using the [configure](/api/methods) method. It should return a Promise.

## Default configuration

If `configure()` is never called, you can get the default configuration by importing it:

```typescript
import { defaultConfiguration } from '@hocuspocus/server'
```

## Hook payload

The `data` passed to the `onConfigure` hook has the following attributes:

```typescript
import { Configuration } from '@hocuspocus/server'

const data = {
  configuration: Configuration,
  version: string,
  yjsVersion: string,
}
```

## Example

```typescript
import { Server } from '@hocuspocus/server'

const hocuspocus = Server.configure({
  async onConfigure(data) {
    // Output some information
    process.stdout.write(`Server was configured!`)
  },
})

hocuspocus.listen()
```
