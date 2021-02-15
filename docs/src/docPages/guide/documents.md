# Working with Documents

## toc

## Documents & room-names

Most Yjs connection providers (including the `y-websocket` provider) use a concept called room-names. The client will pass a room-name parameter to hocuspocus which will then be used to identify the document which is currently being edited. The room-name will be called document name throughout this documentation.

### Real-world example

In a real-world app you would probably add the name of your entity, a unique ID of the entity and in
some cases even the field (if you have multiple fields that you want to make collaborative). Here is
how that could look like for a CMS:

```js
const documentName = 'page.140.content'
```

Now you can easily split this to get all desired information separately:

```js
const [ entityType, entityID, field ] = documentName.split('.')

console.log(entityType) // prints "page"
console.log(entityID) // prints "140"
console.log(field) // prints "content"
```

## Handling Document changes

With the `onChange` hook you can listen to changes of the document and handle them. In a real-world
application you would probably save the resulting document to a database, send a webhook to an API
or something else.

The `onChange` hook itself is debounced, take a look [here](/guide/configuration) on how
to configure this. The synchronization of documents will always be instantaneous and is not affected by debouncing or things you do in this hook.

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

### onConnect hook payload

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

## Loading documents

By default hocuspocus creates a new Y-Doc instance for each new document and stores all those document instances in memory. If you restart the server all changes are gone. So you likely want to persist the document somewhere. You can use one of our [prebuilt extensions](/guide/extensions) and skip this section to get you started as quick and simple as possible.

If you want to alter the Y-Doc when hocuspocus creates it you can use the `onCreateDocument` hook and apply updates directly to the given document. This way you can load your document from a database, an external API or even the file system.

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
      readFileSync(`/path/to/your/documents/${data.documentName}.json`)
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

### onCreateDocument hook payload

The `data` passed to the `onCreateDocument` hook has the following attributes:

```typescript
import { Doc } from 'yjs'

const data = {
  document: Doc,
  documentName: string,
}
```

## Converting a Y-Doc

In the previous example we used the `y-prosemirror` package to transform the Yjs Document (short: Y-Doc) to the format the tiptap editor uses and vice versa.

hocuspocus doesn't care how you structure your data, you can use any Yjs Shared Types you want. You should check out the [Yjs documentation on Shared Types](https://docs.yjs.dev/getting-started/working-with-shared-types) and how to use them, especially if you don't use any of the editors below.


### tiptap / prosemirror

```typescript
import { Doc } from 'yjs'
import { yDocToProsemirrorJSON } from 'y-prosemirror'

const ydoc = new Doc()
const prosemirrorDocument = yDocToProsemirrorJSON(ydoc);
```

### Quill

```typescript
// TODO
```

### Monaco

```typescript
// TODO
```
