# Transformations

## toc

## What is a Y-Doc?

A [Y-Doc](https://docs.yjs.dev/api/y.doc) is the underlying object Yjs uses to store the collaboration history, the documents' fields as a so-called Shared Types and sync everything between clients.

hocuspocus doesn't care how you structure your data, so you need to transform your existing document to a Y-Doc when importing documents and vice versa when saving it for your views. You should check out the [Yjs documentation on Shared Types](https://docs.yjs.dev/getting-started/working-with-shared-types) and how to use them, especially if you don't use any of the editors below.

## Transformers

We already built a few easy to use transformers for you. Add the `@hocupocus/transformer` package:

```bash
npm install @hocuspocus/transformer
```

… and import them:

```typescript
import { TiptapTransformer, ProsemirrorTransformer } from '@hocuspocus/transformer'
```

## Examples

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
const ydoc = TiptapTransformer.toYdoc(prosemirrorJSON, 'field-name', [ Document, Paragraph, Text ])

// Alternatively you can set the extensions on the Transformer instance directly
// and reuse them
const transformer = TiptapTransformer.extensions([ Document, Paragraph, Text ])
const ydoc2 = transformer.toYdoc(prosemirrorJSON, 'field-name')
const ydoc3 = transformer.toYdoc(prosemirrorJSON, 'field-name')
```

### Prosemirror

**Convert a Y-Doc to prosemirror JSON:**

```typescript
import { ProsemirrorTransformer } from '@hocuspocus/transformer'
import { Doc } from 'yjs'

const ydoc = new Doc()
const prosemirrorJSON = ProsemirrorTransformer.fromYdoc(ydoc, 'field-name')
```

**Convert prosemirror JSON to a Y-Doc:**

```typescript
import { ProsemirrorTransformer } from '@hocuspocus/transformer'
import { Schema } from 'prosemirror-model'

const prosemirrorJSON = {
  type: 'doc',
  content: [
    // ...
  ],
}

const prosemirrorSchema = new Schema()

// The ProsemirrorTransformer requires you to pass the schema your editor uses
const ydoc = ProsemirrorTransformer.toYdoc(prosemirrorJSON, 'field-name', prosemirrorSchema)

// Alternatively you can set the schema on the Transformer instance directly
// and reuse it
const transformer = ProsemirrorTransformer.schema(prosemirrorSchema)
const ydoc2 = transformer.toYdoc(prosemirrorJSON, 'field-name')
const ydoc3 = transformer.toYdoc(prosemirrorJSON, 'field-name')
```


### Quill

```typescript
// TODO
```

### Monaco

```typescript
// TODO
```
