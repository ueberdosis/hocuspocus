# onChange

## toc

## Introduction

The `onChange` hook is called when the document itself changes. This hook is [debounced](/guide/configuration#debounce).

## Hook payload

The `data` passed to the `onChange` hook has the following attributes:

```typescript
import { IncomingHttpHeaders } from 'http'
import { URLSearchParams } from 'url'
import { Doc } from 'yjs'

const data = {
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  clientsCount: number,
  document: Doc,
  documentName: string,
  update: Uint8Array,
}
```

## Example

```typescript
import { writeFile } from 'fs'
import { Server } from '@hocuspocus/server'
import { yDocToProsemirrorJSON } from 'y-prosemirror'

const hocuspocus = Server.configure({
  onChange(data) {

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

  },
})

hocuspocus.listen()
```
