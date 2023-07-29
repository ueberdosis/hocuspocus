---
tableOfContents: true
---

# Multi-Document and Subdocuments Support

## Documents & room-names

Most Yjs connection providers (including the `y-websocket` provider) use a concept called
room-names. The client will pass a room-name parameter to Hocuspocus which will then be used to
identify the document which is currently being edited. We will call room-name throughout this
documentation document name.

In a real-world app you would probably use the name of your entity and a unique ID. Here is how that
could look like for a CMS:

```js
const documentName = "page.140";
```

Now you can easily split this to get all desired information separately:

```js
const [entityType, entityID] = documentName.split(".");

console.log(entityType); // prints "page"
console.log(entityID); // prints "140
```

This is a recommendation, of course you can name your documents however you want!

## Nested documents

### Introduction

We're currently evaluating feedback for subdocuments, but haven't implemented support yet.

In a lot of cases, instead of subdocuments, you can use different `fragments` of Yjs, so
if you're thinking about a blog post with `title`/`content`, you can create a single yDoc and use
different editors (or anything else) that are each binding to a different fragment, like this:

```js
const ydoc = new Y.Doc();

const titleEditor = new Editor({
  extensions: [
    Collaboration.configure({
      document: this.ydoc,
      field: "title",
    }),
  ],
})

const bodyEditor = new Editor({
  extensions: [
    Collaboration.configure({
      document: this.ydoc,
      field: "body",
    }),
  ],
})
```

When using multiple fields you can simply merge different documents into the given document:

```ts
import { readFileSync } from "fs";
import { Server } from "@hocuspocus/server";
import { TiptapTransformer } from "@hocuspocus/transformer";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
const generateSampleProsemirrorJson = (text: string) => {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text,
          },
        ],
      },
    ],
  };
};
const server = Server.configure({
  async onLoadDocument(data) {
    // only import things if they are not already set in the primary storage
    if (data.document.isEmpty("default")) {
      // Get a Y-Doc for the 'default' field …
      const defaultField = TiptapTransformer.toYdoc(
        generateSampleProsemirrorJson("What is love?"),
        "default",
        [(Document, Paragraph, Text)]
      );
      // … and merge it into the given document
      data.document.merge(defaultField);
    }
    if (data.document.isEmpty("secondary")) {
      // Get a Y-Doc for the 'secondary' field …
      const secondaryField = TiptapTransformer.toYdoc(
        generateSampleProsemirrorJson("Baby don't hurt me…"),
        "secondary",
        [(Document, Paragraph, Text)]
      );
      // … and merge it into the given document
      data.document.merge(secondaryField);
    }
  },
});
server.listen();
```
