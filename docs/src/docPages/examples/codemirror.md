---
title: Collaborative editing with CodeMirror
---

# CodeMirror

```js
import * as Y from 'yjs'
import { CodemirrorBinding } from 'y-codemirror'
import { WebsocketProvider } from 'y-websocket'

import CodeMirror from 'codemirror'

const ydoc = new Y.Doc()
var provider = new WebsocketProvider('wss://websocket.tiptap.dev', 'hocuspocus-demos-codemirror', ydoc)
const yText = ydoc.getText('codemirror')
const yUndoManager = new Y.UndoManager(yText)

const editor = CodeMirror(document.querySelector('.editor'), {
  mode: 'javascript',
  lineNumbers: true
})

const binding = new CodemirrorBinding(yText, editor, provider.awareness, { yUndoManager })
```

Learn more: https://github.com/yjs/y-codemirror
