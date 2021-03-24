# onCreateDocument

## toc

## Introduction

The `onCreateDocument` hook will be called when a new document is created. A new document will be created if it's not in memory, so it may exist in your application but was not edited since the server started. It should return a Promise. Returning a Y-Doc loads the given document.

## Hook payload

The `data` passed to the `onCreateDocument` hook has the following attributes:

```typescript
import { Doc } from 'yjs'

const data = {
  context: any,
  document: Doc,
  documentName: string,
  socketId: string,
}
```

Context contains the data provided in former `onConnect` hooks.

## Example

```typescript
import { readFileSync } from 'fs'
import { Server } from '@hocuspocus/server'
import { prosemirrorJSONToYDoc } from 'y-prosemirror'
import { getSchema } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'

const hocuspocus = Server.configure({
  async onCreateDocument(data) {
    // The tiptap collaboration extension uses shared types of a single y-doc
    // to store different fields in the same document.
    // The default field in tiptap is simply called "default"
    const fieldName = 'default'

    // Check if the given field already exists in the given y-doc.
    // Only import a document if it doesn't exist in the primary data storage
    if (data.document.get(fieldName)._start) {
      return
    }

    // Get the document from somwhere. In a real world application this would
    // probably be a database query or an API call
    const prosemirrorDocument = JSON.parse(
      readFileSync(`/path/to/your/documents/${data.documentName}.json`) || "{}"
    )

    // When using the tiptap editor we need the schema to create
    // a prosemirror JSON. You can use the `getSchema` method and
    // pass it all the tiptap extensions you're using in the frontend
    const schema = getSchema([ Document, Paragraph, Text ])

    // Convert the prosemirror JSON to a ydoc and simply return it.
    // You can target a specific field by providing a third argument with the name of the field.
    return prosemirrorJSONToYDoc(schema, prosemirrorDocument, fieldName)
  },
})

hocuspocus.listen()
```

:::warning Usa a primary storage
This example above is not intended to be your primary storage as serializing to and deserializing from JSON will not store collaboration history steps but only the resulting document. This example is only meant to import a document if it doesn't exist in your primary storage. For example if you move from tiptap v1 to v2. For a primary storage, check out the [RocksDB extension](/guide/extensions#hocuspocusrocksdb).
:::
