---
tableOfContents: true
---

# Events

## Introduction

Events are a great way to react to different states, for example when the provider has successfully connected. You can choose to bind event listeners on initialization or later, that’s up to you.

## Option 1: Configuration
Passing event listeners to the constructor ensures they are registered during initialization.

```js
const provider = new HocuspocusProvider({
  url: "ws://127.0.0.1:1234",
  name: "example-document",
  document: ydoc,
  onOpen() {
    // …
  },
  onConnect() {
    // …
  },
  onAuthenticated() {
    // …
  },
  onAuthenticationFailed: ({ reason }) => {
    // …
  },
  onStatus: ({ status }) => {
    // …
  },
  onMessage: ({ event, message }) => {
    // …
  },
  onOutgoingMessage: ({ message }) => {
    // …
  },
  onSynced: ({ state }) => {
    // …
  },
  onClose: ({ event }) => {
    // …
  },
  onDisconnect: ({ event }) => {
    // …
  },
  onDestroy() {
    // …
  },
  onAwarenessUpdate: ({ added, updated, removed }) => {
    // …
  },
  onAwarenessChange: ({ states }) => {
    // …
  },
  onStateless: ({ payload }) => {
    // ...
    // the provider can also send a custom message to the server: provider.sendStateless('any string payload')
  }
});
```

## Option 2: Binding
Sometimes you want to register an event listener after the intialization, even if it’s right after. Also, that’s a great way to bind and unbind event listeners.

### Bind event listeners

```js
const provider = new HocuspocusProvider({
  // …
});

provider.on("synced", () => {
  // …
});
```

### Unbind event listeners

```js
const onMessage = () => {
  // A new message comes in
};

// Bind …
provider.on("onMessage", onMessage);

// … and unbind.
provider.off("onMessage", onMessage);
```

## List of events

| Name                 | Description                                                               |
| -------------------- | ------------------------------------------------------------------------- |
| open                 | When the WebSocket connection is created.                                 |
| connect              | When the provider has succesfully connected to the server.                |
| authenticated        | When the client has successfully authenticated.                           |
| authenticationFailed | When the client authentication was not successful.                        |
| status               | When the connections status changes.                                      |
| message              | When a message is incoming.                                               |
| outgoingMessage      | When a message will be sent.                                              |
| synced               | When the Y.js document is successfully synced (initially).                |
| close                | When the WebSocket connection is closed.                                  |
| disconnect           | When the provider disconnects.                                            |
| destroy              | When the provider will be destroyed.                                      |
| awarenessUpdate      | When the awareness updates (see https://docs.yjs.dev/api/about-awareness) |
| awarenessChange      | When the awareness changes (see https://docs.yjs.dev/api/about-awareness) |
| stateless            | When the stateless message was received.                                  |
