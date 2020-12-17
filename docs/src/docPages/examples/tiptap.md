# tiptap

## toc

## Introduction
[tiptap](https://tiptap.dev) is a headless text editor. The following example shows a full-blown version, with a whole bunch of different features, connected to a hocuspocus instance that syncs changes between clients. Open multiple browser windows and try it out!

## Example
<demo name="Tiptap" />

## Integration
The above examples has a lot of bells and whistles. Let’s focus on the collaborative editing part. The below example code shows everything you need to create an instance of tiptap, with all default extension, start your collaboration backend with hocuspocus and connect everything.

### Frontend
Add an element to your HTML document where tiptap should be initialized:
```html
<div class="element"></div>
```

Install the required extensions:
```bash
yarn add @tiptap/starter-kit @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor yjs y-websocket
```

And create your tiptap instance:
```js
import { Editor, defaultExtensions } from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollateborationCursor from '@tiptap/extension-collaboration-cursor'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

const ydoc = new Y.Doc()
const provider = new WebsocketProvider('ws://127.0.0.1', 'example-document', ydoc)

new Editor({
  element: document.querySelector('.element'),
  extensions: [
    ...defaultExtensions().filter(extension => extension.config.name !== 'history'),
    Collaboration.configure({ provider }),
    CollaborationCursor.configure({
      provider,
      user: { name: 'John Doe', '#ffcc00' },
    }),
  ],
})
```

### Backend
[Install hocuspocus](/installation) and create your collaboration backend:

```js
import { Server } from '@hocuspocus/server'
import { LevelDB } from '@hocuspocus/leveldb'

const server = Server.configure({
  persistence: new LevelDB({
    path: './database',
  }),
})

server.listen()
```
