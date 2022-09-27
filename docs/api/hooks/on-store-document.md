---
tableOfContents: true
---

# onStoreDocument

## Introduction

The `onStoreDocument` hook is called after the document has been changed (after the onChange hook) and can
be used to store the changed document to a persistent storage. Calls to `onStoreDocument` are debounced by default
(see `debounce` and `maxDebounce` configuration options).

The easiest way to implement this functionality is by extending the extension `extension-database` and implementing
fetch() and store() methods, as we did that in `extension-sqlite`. You can implement the `onStoreDocument` yourself
with the hook directly, just make sure to apply / encode the states of the yDoc as we did in `extension-database`.

## Hook payload

The `data` passed to the `onStoreDocument` hook has the following attributes:

```js
import { IncomingHttpHeaders } from 'http'
import { URLSearchParams } from 'url'
import { Doc } from 'yjs'

const data = {
  clientsCount: number,
  context: any,
  document: Doc,
  documentName: string,
  instance: Hocuspocus,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  update: Uint8Array,
  socketId: string,
}
```
