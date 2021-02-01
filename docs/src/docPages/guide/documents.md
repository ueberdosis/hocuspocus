# Working with Documents

## toc

## Document names

The `y-websocket` provider passes a document name string to hocuspocus. This document name can be
used to identify the document the current user is editing. (Throughout these docs we
used `example-document`)

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

The `onChange` hook is debounced, take a look [here](/guide/configuration) on how
to configure this.

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

The `data` passed to the `onChange` hook has the following attributes:

```typescript
import { IncomingHttpHeaders } from 'http'
import { URLSearchParams } from 'url'
import { Document } from '@hocuspocus/server'

const data = {
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  clientsCount: number,
  document: Document,
  documentName: string,
  update: Uint8Array,
}
```
