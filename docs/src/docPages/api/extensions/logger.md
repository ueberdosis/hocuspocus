# Logger

## toc

## Introduction

Hocuspocus doesn't log anything to stdout/stderr. Thanks to this simple extension it will.

## Installation

Install the Logger package with:

```bash
# with npm
npm install @hocuspocus/extension-logger

# with Yarn
yarn add @hocuspocus/extension-logger
```

## Configuration

The logger has no configuration options (yet).

```js
import { Server } from '@hocuspocus/server'
import { Logger } from '@hocuspocus/extension-logger'

const server = Server.configure({
  extensions: [
    new Logger(),
  ],
})

server.listen()
```
