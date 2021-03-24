# Logger

## toc

## Introduction

Hocuspocus doesn't log anything to the console. With this simple extension it will.

## Installation

Configure your `.npmrc` to look for packages with the @hocuspocus prefix in our private registry, [as described here](/installation#2-installation).

Now you should be able to install the Monitor package with:

```bash
# with npm
npm install @hocuspocus/logger

# with Yarn
yarn add @hocuspocus/logger
```

## Configuration

The logger has no configuration options (yet).

```js
import { Server } from '@hocuspocus/server'
import { Logger } from '@hocuspocus/logger'

const server = Server.configure({
  extensions: [
    new Logger(),
  ],
})

server.listen()
```
