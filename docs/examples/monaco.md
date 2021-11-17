---
title: Collaborative editing with Monaco
---

# Monaco

```js
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { MonacoBinding } from 'y-monaco'
import * as monaco from 'monaco-editor'

window.MonacoEnvironment = {
  getWorkerUrl: function (moduleId, label) {
    if (label === 'json') {
      return '/monaco/dist/json.worker.bundle.js'
    }
    if (label === 'css') {
      return '/monaco/dist/css.worker.bundle.js'
    }
    if (label === 'html') {
      return '/monaco/dist/html.worker.bundle.js'
    }
    if (label === 'typescript' || label === 'javascript') {
      return '/monaco/dist/ts.worker.bundle.js'
    }
    return '/monaco/dist/editor.worker.bundle.js'
  }
}

window.addEventListener('load', () => {
  const ydoc = new Y.Doc()
  const provider = new WebsocketProvider('wss://websocket.tiptap.dev', 'hocuspocus-demos-monaco', ydoc)
  const type = ydoc.getText('monaco')

  const editor = monaco.editor.create(document.querySelector('.editor'), {
    value: '',
    language: 'javascript',
    theme: 'vs-dark'
  })
  const monacoBinding = new MonacoBinding(type, editor.getModel(), new Set([editor]), provider.awareness)

  window.example = { provider, ydoc, type, monacoBinding }
})
```

Learn more: https://github.com/yjs/y-monaco
