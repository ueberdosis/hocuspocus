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

:::warning Use a primary storage
The following example is not intended to be your primary storage as serializing to and deserializing from JSON will not store collaboration history steps but only the resulting document. This example is only meant to store the resulting document for the views of your application. For a primary storage, check out the [RocksDB extension](/extensions/rocksdb).
:::

```typescript
import { debounce } from 'debounce'
import { Server } from '@hocuspocus/server'
import { TiptapTransformer } from '@hocuspocus/transformer'
import { writeFile } from 'fs'

let debounced

const hocuspocus = Server.configure({
  async onChange(data) {
    const save = () => {
      // Convert the y-doc to something you can actually use in your views.
      // In this example we use the TiptapTransformer to get JSON from the given
      // ydoc.
      const prosemirrorJSON = TiptapTransformer.fromYdoc(data.document)

      // Save your document. In a real-world app this could be a database query
      // a webhook or something else
      writeFile(
        `/path/to/your/documents/${data.documentName}.json`,
        prosemirrorJSON
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
