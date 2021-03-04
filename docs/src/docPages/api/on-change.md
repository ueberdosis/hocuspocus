# onChange

## toc

## Introduction

The `onChange` hook is called when the document itself changes. It should return a Promise.

:::warning Consider debouncing!
It's highly recommended to debounce extensive operations as this hook can be fired up to multiple times a second.
:::

## Hook payload

The `data` passed to the `onChange` hook has the following attributes:

```typescript
import { IncomingHttpHeaders } from 'http'
import { URLSearchParams } from 'url'
import { Doc } from 'yjs'

const data = {
  clientsCount: number,
  context: any,
  document: Doc,
  documentName: string,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  update: Uint8Array,
  socketId: string,
}
```

Context contains the data provided in former `onConnect` hooks.

## Example

```typescript
import { writeFile } from 'fs'
import { Server } from '@hocuspocus/server'
import { yDocToProsemirrorJSON } from 'y-prosemirror'
import { debounce } from 'debounce'

let debounced

const hocuspocus = Server.configure({
  async onChange(data) {
    const save = () => {
      // Get the underlying Y-Doc
      const ydoc = data.document

      // Convert the y-doc to the format your editor uses, in this
      // example Prosemirror JSON for the tiptap editor
      const prosemirrorDocument = yDocToProsemirrorJSON(ydoc)

      // Save your document. In a real-world app this could be a database query
      // a webhook or something else
      writeFile(
        `/path/to/your/documents/${data.documentName}.json`,
        prosemirrorDocument
      )
    }

    debounced?.clear()
    debounced = debounce(() => save, 4000)
    debounced()
  },
})

hocuspocus.listen()
```
