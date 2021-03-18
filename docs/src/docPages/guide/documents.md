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

## Handling Document changes

With the `onChange` hook you can listen to changes of the document and handle them. It should return a Promise. It's payload contains the resulting document as well as the actual update in the Y-Doc binary format. For more information on the hook and it's payload checkout it's [API section](/api/on-change).

In a real-world application you would probably save the current document to a database, send it via webhook to an API
or something else.

It's highly recommended to debounce extensive operations (like API calls) as this hook can be fired up to multiple times a second:

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

## Using a primary storage

The example above is **not intended** to be your primary storage as serializing to and deserializing from JSON will not store collaboration history steps but only the resulting document. This example is only meant to store the resulting document for the views of your application.

No worries, we have you covered! We built an extension that's meant to be used as primary storage: the [RocksDB extension](/guide/extensions#hocuspocusrocksdb). It's just a couple of lines to integrate and it already ships with the default hocuspocus license.

Make sure to always include this extension in your production setups!

## Importing documents

If you want to alter the Y-Doc when hocuspocus creates it, you can use the `onCreateDocument` hook and apply updates directly to the given document. This way you can load your document from a database, an external API or even the file system if they are **not present** in your [primary storage](#using-a-primary-storage). For more information on the hook and it's payload checkout it's [API section](/api/on-create-document).

If you're using the tiptap editor you will need the schema to create a Y-Doc from the prosemirror JSON. Fortunately tiptap has you covered with it's `getSchema` function.

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

## Converting a Y-Doc

In the previous example we used the `y-prosemirror` package to transform the Yjs Document (short: Y-Doc) to the format the tiptap editor uses and vice versa.

hocuspocus doesn't care how you structure your data, you can use any Yjs Shared Types you want. You should check out the [Yjs documentation on Shared Types](https://docs.yjs.dev/getting-started/working-with-shared-types) and how to use them, especially if you don't use any of the editors below. But if you do, those examples should give you a head start.


### tiptap / prosemirror

**Convert a Y-Doc to prosemirror JSON:**

```typescript
import { Doc } from 'yjs'
import { yDocToProsemirrorJSON } from 'y-prosemirror'

const ydoc = new Doc()
const newProsemirrorDocument = yDocToProsemirrorJSON(ydoc, 'field-name');
```

**Convert prosemirror JSON to a Y-Doc:**

```typescript
import { prosemirrorJSONToYDoc } from 'y-prosemirror'
import { getSchema } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'

const prosemirrorDocument = {
  type: 'doc',
  content: [
    // ...
  ],
}

// We need the schema to create a prosemirror JSON. You can use
// the `getSchema` method of the tiptap editor and pass it all
// the tiptap extensions you're using in the frontend
const schema = getSchema([ Document, Paragraph, Text ])

const newYdoc = prosemirrorJSONToYDoc(schema, newProsemirrorDocument, 'field-name')
```

### Quill

```typescript
// TODO
```

### Monaco

```typescript
// TODO
```
