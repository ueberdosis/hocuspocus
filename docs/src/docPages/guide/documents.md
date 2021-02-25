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

With the `onChange` hook you can listen to changes of the document and handle them. It should return a Promise. In a real-world application you would probably save the resulting document to a database, send a webhook to an API
or something else.

For more information on the hook and it's payload checkout it's [API section](/api/on-change).

:::warning Consider debouncing!
It's highly recommended to debounce extensive operations as this hook can be fired up to multiple times a second.
:::

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
      const prosemirrorDocument = yDocToProsemirrorJSON(ydoc, 'field-name')

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

## Loading documents

By default hocuspocus creates a new Y-Doc instance for each new document and stores all those document instances in memory. If you restart the server all changes are gone. So you likely want to persist the document somewhere. You can use one of our [prebuilt extensions](/guide/extensions) and skip this section to get you started as quick and simple as possible.

If you want to alter the Y-Doc when hocuspocus creates it, you can use the `onCreateDocument` hook and apply updates directly to the given document. This way you can load your document from a database, an external API or even the file system.

For more information on the hook and it's payload checkout it's [API section](/api/on-create-document).

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
    // Get the document from somwhere. In a real world application this would
    // probably be a database query or an API call
    const prosemirrorDocument = JSON.parse(
      readFileSync(`/path/to/your/documents/${data.documentName}.json`) || "{}"
    )

    // When using the tiptap editor we need the schema to create
    // a prosemirror JSON. You can use the `getSchema` method and
    // pass it all the tiptap extensions you're using in the frontend
    const schema = getSchema([ Document, Paragraph, Text ])

    // Convert the prosemirror JSON to a ydoc and simply return it
    return prosemirrorJSONToYDoc(schema, prosemirrorDocument)
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

const newYdoc = prosemirrorJSONToYDoc(schema, newProsemirrorDocument)
```

### Quill

```typescript
// TODO
```

### Monaco

```typescript
// TODO
```
