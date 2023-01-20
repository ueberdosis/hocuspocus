---
tableOfContents: true
---

# onLoadDocument

## Introduction
The `onLoadDocument` hooks are called to fetch existing data from your storage. You are probably used to loading some JSON/HTML document in your application, but that’s not the Y.js-way. For Y.js to work properly, we’ll need to store the history of changes. Only then changes from multiple sources can be merged.

You still can store a JSON/HTML document, but see it more as a “view” on your data, not as your data source.

## Create a Y.js document from JSON/HTML (once)
You can create a Y.js document from your existing data, for example JSON. You should use this to migrate data only, not as a permanent way to store your data.

To do this, you can use the Transformer package. For Tiptap-compatible JSON it would look like that:

```js
import { Server } from '@hocuspocus/server'
import { TiptapTransformer } from '@hocuspocus/transformer'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'

const ydoc = TiptapTransformer.toYdoc(
  // the actual JSON
  json,
  // the `field` you’re using in Tiptap. If you don’t know what that is, use 'default'.
  'default',
  // The Tiptap extensions you’re using. Those are important to create a valid schema.
  [Document, Paragraph, Text],
)
```

However, we expect you to return a Y.js document from the `onLoadDocument` hook, no matter where it’s from.

```js
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  async onLoadDocument(data) {
    // fetch the Y.js document from somewhere
    const ydoc = …

    return ydoc
  },
})

server.listen()
```

## Fetch your Y.js documents (recommended)
There are multiple ways to store your Y.js documents (and their history) wherever you like. Basically, you should use the `onStoreDocument` hook, which is debounced and executed every few seconds for changed documents. It gives you the current Y.js document and it’s up to you to store that somewhere. No worries, we provide some convient ways for you.

If you just want to to get it working, have a look at the [`SQLite`](/api/extensions/sqlite) extension for local development, and the generic [`Database`](/api/extensions/database) extension for a convenient way to fetch and store documents.

## Hook payload
The `data` passed to the `onLoadDocument` hook has the following attributes:

```js
import { Doc } from 'yjs'

const data = {
  context: any,
  document: Doc,
  documentName: string,
  instance: Hocuspocus,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  socketId: string
}
```

Context contains the data provided in former `onConnect` hooks.
