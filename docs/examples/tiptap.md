---
title: Collaborative editing with Tiptap
tableOfContents: true
---

# Tiptap

## Introduction
[Tiptap](https://tiptap.dev) is a headless text editor, that’s fully customizable and has a first-class collaborative editing integration that’s compatible with Hocuspocus.

## Getting started
The above examples has a lot of bells and whistles. Let’s focus on the collaborative editing part. The below example code shows everything you need to create an instance of Tiptap, with all default extension, start your collaboration backend with Hocuspocus and connect everything.

Add an element to your HTML document where Tiptap should be initialized:
```html
<div class="element"></div>
```

Install the required extensions:
```bash
npm install @hocuspocus/provider @tiptap/core @tiptap/pm @tiptap/starter-kit @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor yjs y-prosemirror
```

And create your Tiptap instance:
```js
import { Editor } from '@tiptap/core'
import { StarterKit } from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'

const ydoc = new Y.Doc()

const provider = new HocuspocusProvider({
  url: 'ws://127.0.0.1',
  name: 'example-document',
  document: ydoc,
})

new Editor({
  element: document.querySelector('.element'),
  extensions: [
    StarterKit.configure({
      history: false,
    }),
    Collaboration.configure({
      document: ydoc,
    }),
    CollaborationCursor.configure({
      provider,
      user: { name: 'John Doe', color: '#ffcc00' },
    }),
  ],
})
```

