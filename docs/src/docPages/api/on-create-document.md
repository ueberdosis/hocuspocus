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
    // Get the document from somwhere. In a real world application this would
    // probably be a database query or an API call
    const prosemirrorDocument = JSON.parse(
      readFileSync(`/path/to/your/documents/${data.documentName}.json`) || "{}"
    )

    // When using the tiptap editor we need the schema to create
    // a prosemirror JSON. You can use the `getSchema` method and
    // pass it all the tiptap extensions you're using in the frontend
    const schema = getSchema([ Document, Paragraph, Text ])

    // Convert the prosemirror JSON to a Y-Doc and return it
    return prosemirrorJSONToYDoc(schema, prosemirrorDocument)
  },
})

hocuspocus.listen()
```
