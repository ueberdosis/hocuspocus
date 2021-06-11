# Installation

## toc

## Introduction
You’ve got your hocuspocus server running? Time to take the hocuspocus provider for a test drive! Install it from npm, and start using it with a few lines of code.

## Install the provider
Let’s install Y.js and the hocuspocus provider first:

```bash
# with npm
npm install yjs @hocuspocus/provider

# with Yarn
yarn add yjs @hocuspocus/provider
```

## Usage
To use it, create a new Y.js document (if you don’t have one anyway), and attach it to the hocuspocus provider.

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

Done! You’ve now connected a Y.js document to the hocuspocus server. Changes to the Y.js document will be synced to all other connected users.



