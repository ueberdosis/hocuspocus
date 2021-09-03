# Configuration

## toc

## Introduction
Pass a single object with all your custom settings to the provider and you’re good to go.

## Configure the provider
There is not much required to set up the provider, here is how a minimal setup should look like:

```js
const ydoc = new Y.Doc()

const provider = new HocuspocusProvider({
  url: 'ws://127.0.0.1:1234',
  name: 'example-document',
  document: ydoc,
  // …
})
```

## List of settings
There is definitely more to configure. Find the full list of all available settings below.

| Name                    | Default           | Description                                                                                             |
| ----------------------- | ----------------- | ------------------------------------------------------------------------------------------------------- |
| url                     | `''`              | The URL of the hocuspocus/WebSocket server.                                                             |
| parameters              | `{}`              | Parameters will be added to the server URL and passed to the server.                                    |
| name                    | `''`              | The name of the document.                                                                               |
| document                | `''`              | The actual Y.js document.                                                                               |
| token                   | `''`              | An authentication token that will be passed to the server (works with strings, functions and Promises). |
| awareness               | `new Awareness()` | Awareness object, by default attached to the passed Y.js document.                                      |
| connect                 | `true`            | Whether to connect to the server after intialization.                                                   |
| broadcast               | `true`            | By default changes are synced between browser tabs through broadcasting.                                |
| ~~debug~~ (wip)         | `false`           | Verbose output on the console.                                                                          |
| forceSyncInterval       | `false`           | Ask the server every x ms for updates.                                                                  |
| maxReconnectTimeout     | `2500`            |                                                                                                         |
| messageReconnectTimeout | `30000`           |                                                                                                         |
| reconnectTimeoutBase    | `1200`            |                                                                                                         |
| WebSocketPolyfill       | `WebSocket`       | Running in Node.js: Pass a WebSocket polyfill, for example `ws`.                                        |
