# Installation

## 1. Buy a license
You can buy a licenses in [our store](https://store.ueber.io). For a single developer it’s $99/year, for teams it’s $499/year (local taxes may apply). You can cancel your subscription at any time.

## 2. Installation
Add a `.npmrc` file to your project folder. This will make your package manager look for packages prefixed with @hocuspocus in our registry and passes [your individual token](https://store.ueber.io/purchases):

```
@hocuspocus:registry=https://registry.ueber.io
//registry.ueber.io/:_authToken=YOUR_TOKEN
```

Now, you should be able to install the core package. You can install other packages later, let’s start with a basic version for now:

```bash
# with npm
npm install @hocuspocus/server

# with Yarn
yarn add @hocuspocus/server
```

## 3. Start your server
The following example is the bare minimum you need to start a WebSocket server. By default, it’s listening on [http://127.0.0.1](http://127.0.0.1) (or with the WebSocket protocol on ws://127.0.0.1):

```js
import { Server } from '@hocuspocus/server'

Server.listen()
```

## 4. Connect with a frontend
Now, you’ll need to use Y.js in your frontend and connect to the server with the WebSocket provider. With tiptap, our very own text editor, it’s also just a few lines of code.

That’s it. :)
