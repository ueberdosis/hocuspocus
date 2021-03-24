# onChange

## toc

## Introduction

The `onChange` hook is called when the document itself changes. It should return a Promise.

It's highly recommended to debounce extensive operations as this hook can be fired up to multiple times a second.

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
      // example Prosemirror JSON for the tiptap editor.
      // The tiptap collaboration extension uses shared types of a single y-doc
      // to store different fields in the same document. You can target a specific
      // field by providing a second argument with the name of the field.
      // The default field in tiptap is simply called "default"
      const prosemirrorDocument = yDocToProsemirrorJSON(ydoc, 'field-name')

      // Save your document. In a real-world app this could be a database query
      // a webhook or something else
      writeFile(
        `/path/to/your/documents/${data.documentName}.json`,
        prosemirrorDocument
      )

      // Maybe you want to store the user who changed the document?
      // Guess what, you have access to your custom context from the
      // onConnect hook here. See authorization & authentication for more
      // details
      console.log(`Document ${data.documentName} changed by ${data.context.user.name}`)
    }

    debounced?.clear()
    debounced = debounce(() => save, 4000)
    debounced()
  },
})

hocuspocus.listen()
```

:::warning Usa a primary storage
This example above is not intended to be your primary storage as serializing to and deserializing from JSON will not store collaboration history steps but only the resulting document. This example is only meant to store the resulting document for the views of your application. For a primary storage, check out the [RocksDB extension](/guide/extensions#hocuspocusrocksdb).
:::
