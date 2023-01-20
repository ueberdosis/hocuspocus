---
tableOfContents: true
---

# Nested documents

## Introduction

We're currently evaluating feedback for subdocuments, but haven't implemented support yet.

In a lot of cases, instead of subdocuments, you can use different `fragments` of Yjs, so
if you're thinking about a blog post with `title`/`content`, you can create a single yDoc and use
different editors (or anything else) that are each binding to a different fragment, like this:

```js
const ydoc = new Y.Doc()

const titleEditor = new Editor({
  extensions: [
    Collaboration.configure({
      document: this.ydoc,
      field: 'title',
    }),
  ]
})

const bodyEditor = new Editor({
  extensions: [
    Collaboration.configure({
      document: this.ydoc,
      field: 'body',
    }),
  ]
})
```
