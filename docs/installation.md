# Installation

## 1. Install the core package
You can install other packages later, let’s start with a basic version for now:

```bash
npm install @hocuspocus/server
```

## 2. Start your server
The following example is the bare minimum you need to start a WebSocket server. By default, it’s listening on [http://127.0.0.1](http://127.0.0.1) (or with the WebSocket protocol on ws://127.0.0.1):

```js
import { Server } from '@hocuspocus/server'

const hocuspocus = Server.configure({
  port: 80,
})

hocuspocus.listen()
```

## 3. Connect with a frontend
Now, you’ll need to use Y.js in your frontend and connect to the server with the WebSocket provider. With tiptap, our very own text editor, it’s also just a few lines of code.

That’s it. :)
