---
tableOfContents: true
---

# Installation

## Introduction
You’ve got your Hocuspocus server running? Time to take the Hocuspocus provider for a test drive! Install it from npm, and start using it with a few lines of code.

## Install the provider

```bash
npm install yjs @hocuspocus/provider
```

## Usage
To use it, create a new Y.js document (if you don’t have one already), and attach it to the Hocuspocus provider.

```js
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'

const ydoc = new Y.Doc()

const provider = new HocuspocusProvider({
  url: 'ws://127.0.0.1:1234',
  name: 'example-document',
  document: ydoc,
})
```

Done! You’ve now connected a Y.js document to the Hocuspocus server. Changes to the Y.js document will be synced to all other connected users.
