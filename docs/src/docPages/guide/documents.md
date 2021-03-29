# Working with Documents

## toc

## Documents & room-names

Most Yjs connection providers (including the `y-websocket` provider) use a concept called room-names. The client will pass a room-name parameter to hocuspocus which will then be used to identify the document which is currently being edited. We will call room-name throughout this documentation document name.

In a real-world app you would probably use the name of your entity and a unique ID. Here is how that could look like for a CMS:

```js
const documentName = 'page.140'
```

Now you can easily split this to get all desired information separately:

```js
const [ entityType, entityID ] = documentName.split('.')

console.log(entityType) // prints "page"
console.log(entityID) // prints "140
```

This is a recommendation, of course you can name your documents however you want!

## Using a primary storage

One thing up front:

The following examples are **not intended** to be your primary storage as serializing to and deserializing from JSON will not store collaboration history steps but only the resulting document. These examples are only meant to store the resulting document for the views of your application or to import it if it doesn't exist in your primary storage.

No worries, we have you covered! We built an extension that's meant to be used as primary storage: the [RocksDB extension](/extensions/rocksdb). It's just a couple of lines to integrate and it already ships with the default hocuspocus license.

Make sure to always include this extension in your production setups!

## Handling Document changes

With the `onChange` hook you can listen to changes of the document and handle them. It should return a Promise. It's payload contains the resulting document as well as the actual update in the Y-Doc binary format. For more information on the hook and it's payload checkout it's [API section](/api/on-change).

In a real-world application you would probably save the current document to a database, send it via webhook to an API
or something else. If you want to send a webhook to an external API we already have you covered: [Check out our webhook extension](/extensions/webhook).

It's **highly recommended** to debounce extensive operations (like API calls) as this hook can be fired up to multiple times a second:

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

## Importing documents

If you want to alter the Y-Doc when hocuspocus creates it, you can use the `onCreateDocument` hook and apply updates directly to the given document. This way you can load your document from a database, an external API or even the file system if they are **not present** in your [primary storage](#using-a-primary-storage). For more information on the hook and it's payload checkout it's [API section](/api/on-create-document).

If you're using the tiptap editor you will need the schema to create a Y-Doc from the prosemirror JSON. Fortunately tiptap has you covered with it's `getSchema` function.

```typescript
import { readFileSync } from 'fs'
import { Server } from '@hocuspocus/server'
import { TiptapTransformer } from '@hocuspocus/transformer'
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
    // Important: Only import a document if it doesn't exist in the primary data storage!
    if (data.document.isEmpty(fieldName)) {
      return
    }

    // Get the document from somwhere. In a real world application this would
    // probably be a database query or an API call
    const prosemirrorJSON = JSON.parse(
      readFileSync(`/path/to/your/documents/${data.documentName}.json`) || "{}"
    )

    // Convert the editor format to a y-doc. The TiptapTransformer requires you to pass the list
    // of extensions you use in the frontend to create a valid document
    return TiptapTransformer.toYdoc(prosemirrorJSON, [ Document, Paragraph, Text ], fieldName)
  },
})

hocuspocus.listen()
```

## Importing a document with multiple fields

// TODO

## Converting a Y-Doc

In the previous example we used the `y-prosemirror` package to transform the Yjs Document (short: Y-Doc) to the format the tiptap editor uses and vice versa.

hocuspocus doesn't care how you structure your data, you can use any Yjs Shared Types you want. You should check out the [Yjs documentation on Shared Types](https://docs.yjs.dev/getting-started/working-with-shared-types) and how to use them, especially if you don't use any of the editors below. But if you do, those examples should give you a head start.


### tiptap

**Convert a Y-Doc to prosemirror JSON:**

```typescript
import { TiptapTransformer } from '@hocuspocus/transformer'
import { Doc } from 'yjs'

const ydoc = new Doc()
const prosemirrorJSON = TiptapTransformer.fromYdoc(ydoc, 'field-name')
```

**Convert prosemirror JSON to a Y-Doc:**

```typescript
import { TiptapTransformer } from '@hocuspocus/transformer'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'

const prosemirrorJSON = {
  type: 'doc',
  content: [
    // ...
  ],
}

// The TiptapTransformer requires you to pass the list of  extensions you use in
// the frontend to create a valid document
const ydoc = TiptapTransformer.toYdoc(prosemirrorJSON, [ Document, Paragraph, Text ], 'field-name')
```

### Quill

```typescript
// TODO
```

### Monaco

```typescript
// TODO
```
