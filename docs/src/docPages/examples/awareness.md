# Awareness

## toc

## Introduction
You can sync information about all present users through the Awareness API. You’re completely free to share whatever you like, for example a name, a color, the cursor position, or even a position a 3D system – do it!

## Example
```js
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'

// Set up a new Y.js document
const ydoc = new Y.Doc()

// Init an empty Array where all states are stored then
const states = []

// Connect it to the backend
const provider = new HocuspocusProvider({
  url: 'ws://127.0.0.1:1234',
  name: 'example-document',
  document: ydoc,
  onAwarenessUpdate: ({ newStates }) => {
    states = newStates
  },
})

// For example, listen for mouse movements
document.addEventListener('mousemove', event => {

  // Share any information you like
  provider.setAwarenessField('user', {
    name: 'Kevin Jahns',
    color: '#ffcc00',
    mouseX: event.clientX,
    mouseY: event.clientY,
  })

})
```

→ [Read more about Awareness](/provider/awareness)
