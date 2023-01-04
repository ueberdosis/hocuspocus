---
tableOfContents: true
---

# onAwarenessUpdate

## Introduction

The `onAwarenessUpdate` hook is called when awareness changed ([Provider Awareness API](/provider/awareness)).

## Hook payload
The `data` passed to the `onAwarenessUpdate` hook has the following attributes:

```js
import { IncomingHttpHeaders } from 'http'
import { URLSearchParams } from 'url'
import { Awareness } from 'y-protocols/awareness'

const data = {
  clientsCount: number,
  context: any,
  document: Document,
  documentName: string,
  instance: Hocuspocus,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  update: Uint8Array,
  socketId: string,
  added: number[],
  updated: number[],
  removed: number[],
  awareness: Awareness,
  states: { clientId: number, [key: string | number]: any }[],

}
```

## Example

```js
const provider = new HocuspocusProvider({
  url: 'ws://127.0.0.1:1234',
  name: 'example-document',
  document: ydoc,
  onAwarenessUpdate: ({ states }) => {
    currentStates = states
  },
})
```
