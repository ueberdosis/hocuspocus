# onCreateDocument

## toc

## Introduction

The `onCreateDocument` hook will be called when a new document is created. A new document will be created if it's not in memory, so it may exist in your application but was not edited since the server started. The `onCreateDocument` hook accepts a `resolve()` method as second argument. Pass your Y-Doc to the resolve method to this method to load an existing document.

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

const hocuspocus = Server.configure({
  onCreateDocument(data, resolve) {
    // Get the document from somwhere. In a real world application this would
    // probably be a database query or an API call
    const prosemirrorDocument = JSON.parse(
      readFileSync(`/path/to/your/documents/${data.documentName}.json`) || "{}"
    )

    // We need the prosemirror schema you're using in the editor
    const schema = new Schema({
      nodes: {
        text: {},
        doc: { content: "text*" },
      },
    })

    // Convert the prosemirror JSON to a ydoc
    const ydoc = prosemirrorJSONToYDoc(schema, prosemirrorDocument)

    // And pass it to the resolve method
    resolve(ydoc)
  },
})

hocuspocus.listen()
```
