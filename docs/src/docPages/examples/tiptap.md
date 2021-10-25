---
title: Collaborative editing with tiptap
---

# tiptap

## toc

## Introduction
[tiptap](https://tiptap.dev) is a headless text editor, that’s fully customizable and has a first-class collaborative editing integration that’s compatible with Hocuspocus.

## Example
The following example shows a full-blown version, with a whole bunch of different features, connected to a Hocuspocus instance that syncs changes between clients. Open multiple browser windows and try it out!

<demo name="Examples/Tiptap" />

## Getting started
The above examples has a lot of bells and whistles. Let’s focus on the collaborative editing part. The below example code shows everything you need to create an instance of tiptap, with all default extension, start your collaboration backend with Hocuspocus and connect everything.

Add an element to your HTML document where tiptap should be initialized:
```html
<div class="element"></div>
```

Install the required extensions:
```bash
yarn add @hocuspocus/provider @tiptap/starter-kit @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor yjs
```

And create your tiptap instance:
```js
import { Editor, StarterKit } from '@tiptap/starter-kit'
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
    Collaboration.configure({ provider }),
    CollaborationCursor.configure({
      provider,
      user: { name: 'John Doe', '#ffcc00' },
    }),
  ],
})
```

Read more: https://www.tiptap.dev/guide/collaborative-editing
