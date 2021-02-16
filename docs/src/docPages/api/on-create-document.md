# onCreateDocument

## toc

## Introduction

The `onCreateDocument` hook will be called when a new document is created. A new document will be created if it's not in memory, thus it may exist but was not edited since the server started.

## Hook payload

The `data` passed to the `onCreateDocument` hook has the following attributes:

```typescript
import { Doc } from 'yjs'

const data = {
  document: Doc,
  documentName: string,
}
```

## Example

```typescript
import { readFileSync } from 'fs'
import { Server } from '@hocuspocus/server'
import { prosemirrorJSONToYDoc } from 'y-prosemirror'
import { Schema } from 'prosemirror-model'
import { applyUpdate, encodeStateAsUpdate } from 'yjs'

const hocuspocus = Server.configure({
  onCreateDocument(data) {
    // Get the document from somwhere. In a real world application this would
    // probably be a database query or an API call
    const prosemirrorDocument = JSON.parse(
      readFileSync(`/path/to/your/documents/${data.documentName}.json`) || "{}"
    )

    // We need the prosemirror schema you're using in the editor
    const schema = new Schema({
      nodes: {
        text: {},
        doc: { content: "text*" }
      }
    })

    // Convert the prosemirror JSON to a ydoc
    const ydoc = prosemirrorJSONToYDoc(schema, prosemirrorDocument)

    // Encode the current state as a Yjs update
    const update = encodeStateAsUpdate(ydoc)

    // And apply the update to the Y-Doc hocuspocus provides
    applyUpdate(data.document, update)
  },
})

hocuspocus.listen()
```
