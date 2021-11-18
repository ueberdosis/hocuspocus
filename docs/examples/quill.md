---
title: Collaborative editing with Quill
---

# Quill

```js
import Quill from 'quill'
import QuillCursors from 'quill-cursors'

import * as Y from 'yjs'
import { QuillBinding } from 'y-quill'
import { WebsocketProvider } from 'y-websocket'

Quill.register('modules/cursors', QuillCursors)

var ydoc = new Y.Doc()
var type = ydoc.getText('quill')
var provider = new WebsocketProvider('wss://websocket.tiptap.dev', 'hocuspocus-demos-quill', ydoc)

var quill = new Quill('.editor', {
  theme: 'snow',
  modules: {
    cursors: true,
      history: {
        userOnly: true
      },
    },
  }
)

new QuillBinding(type, quill, provider.awareness)
```

Learn more: https://github.com/yjs/y-quill
