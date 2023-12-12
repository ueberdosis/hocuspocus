---
tableOfContents: true
---

# Hooks

## Introduction

Hocuspocus offers hooks to extend its functionality and integrate it into existing applications. Hooks are configured as simple methods the same way as [other configuration options](/server/configuration) are.

Hooks accept a hook payload as first argument. The payload is an object that contains data you can use and manipulate, allowing you to built complex things on top of this simple mechanic, like [extensions](/guides/custom-extensions).

Hooks are required to return a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise); the easiest way to do that is to mark the function as `async` (Node.js version must 14+). In this way, you can do things like executing API requests, running DB queries, trigger webhooks or whatever you need to do to integrate it into your application.

## Lifecycle

Hooks will be called on different stages of the Hocuspocus lifecycle. For example the `onListen` hook will be called when you call the `listen()` method on the server instance.

Some hooks allow you not only to react to those events but also to intercept them. For example the `onConnect` hook will be fired when a new connection is made to underlying websocket server. By rejecting the Promise in your hook (or throwing an empty exception if using async) you can terminate the connection and stop the chain.

## The hook chain

Extensions use hooks to add additional functionality to Hocuspocus. They will be called one after another in the order of their registration with your configuration as the last part of the chain.

If the Promise in a hook is rejected it will not be called for the following extensions or your configuration. It's like a stack of middlewares a request has to go through. Keep that in mind when working with hooks.

By way of illustration, if a user isn’t allowed to connect: Just throw an error in the `onAuthenticate()` hook. Nice, isn’t it?

## Summary Table

| Hook                       | Description                               | Link                                                  |
| -------------------------- |-------------------------------------------|-------------------------------------------------------|
| `beforeHandleMessage`      | Before handling a message                 | [Read more](/server/hooks#before-handle-message)      |
| `onConnect`                | When a connection is established          | [Read more](/server/hooks#on-connect)                 |
| `connected`                | After a connection has been establied     | [Read more](/server/hooks#connected)                  |
| `onAuthenticate`           | When authentication is required           | [Read more](/server/hooks#on-authenticate)            |
| `onAwarenessUpdate`        | When awareness changed                    | [Read more](/server/hooks#on-awareness-update)        |
| `onLoadDocument`           | During the creation of a new document     | [Read more](/server/hooks#on-load-document)           |
| `afterLoadDocument`        | After a document is created               | [Read more](/server/hooks#after-load-document)        |
| `onChange`                 | When a document has changed               | [Read more](/server/hooks#on-change)                  |
| `onDisconnect`             | When a connection was closed              | [Read more](/server/hooks#on-disconnect)              |
| `onListen`                 | When the server is initialized            | [Read more](/server/hooks#on-listen)                  |
| `onDestroy`                | When the server will be destroyed         | [Read more](/server/hooks#on-destroy)                 |
| `onConfigure`              | When the server has been configured       | [Read more](/server/hooks#on-configure)               |
| `onRequest`                | When a HTTP request comes in              | [Read more](/server/hooks#on-request)                 |
| `onStoreDocument`          | When a document has been changed          | [Read more](/server/hooks#on-store-document)          |
| `onUpgrade`                | When the WebSocket connection is upgraded | [Read more](/server/hooks#on-upgrade)                 |
| `onStateless`              | When the Stateless message is received    | [Read more](/server/hooks#on-stateless)               |
| `beforeBroadcastStateless` | Before broadcast a stateless message      | [Read more](/server/hooks#before-broadcast-stateless) |
| `afterUnloadDocument`      | When a document is closed                 | [Read more](/server/hooks#after-unload-document)      |


## Usage

```js
import { Server } from "@hocuspocus/server";

const server = new Server({
  async onAuthenticate({ documentName, token }) {
    // Could be an API call, DB query or whatever …
    // The endpoint should return 200 OK in case the user is authenticated, and an http error
    // in case the user is not.
    return axios.get("/user", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
});

server.listen();
```

## Hooks

### beforeHandleMessage

The `beforeHandleMessage` hooks are called when a message was received by the server, directly before
handling / applying it. The hook can be used to reject a message (e.g. if the authentication token has
expired), or even to check the update message and reject / accept it based on custom rules. If you
throw an error in the hook, the connection will be closed. You can return a custom code / reason by
throwing an error that implements CloseEvent (see example below).

**Hook payload**

The `data` passed to the `beforeHandleMessage` hook has the following attributes:

```js
import { IncomingHttpHeaders } from "http";
import { URLSearchParams } from "url";
import { Doc } from "yjs";
import { CloseEvent } from "@hocuspocus/common";

const data = {
  clientsCount: number,
  context: any,
  document: Doc,
  documentName: string,
  instance: Hocuspocus,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  update: Uint8Array,
  socketId: string,
};
```

Context contains the data provided in former `onConnect` hooks.

**Example**

```js
import { debounce } from "debounce";
import { Server } from "@hocuspocus/server";
import { TiptapTransformer } from "@hocuspocus/transformer";
import { writeFile } from "fs";

let debounced;

const server = new Server({
  beforeHandleMessage(data) {
    if (data.context.tokenExpiresAt <= new Date()) {
      const error: CloseEvent = {
        reason: "Token expired",
      };

      throw error;
    }
  },
});

server.listen();
```

### connected

The `connected` hooks are called after a new connection has been successfully established.

**Example**

```js
import { Server } from "@hocuspocus/server";

const server = new Server({
  async connected() {
    console.log("connections:", server.getConnectionsCount());
  },
});

server.listen();
```

### onAuthenticate

The `onAuthenticate` hook will be called when the server receives an authentication request from the client provider.
It should return a Promise. Throwing an exception or rejecting the Promise will terminate the connection.

Be aware, the onAuthenticate hook will only be called after the client has sent the Auth message, which won't happen
if there is no token provided to HocuspocusProvider.

**Hook payload**

The `data` passed to the `onAuthenticate` hook has the following attributes:

```js
import { IncomingHttpHeaders } from "http";
import { URLSearchParams } from "url";
import { Doc } from "yjs";

const data = {
  documentName: string,
  instance: Hocuspocus,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  socketId: string,
  token: string,
  connection: {
    readOnly: boolean,
  },
};
```

**Example**

```js
import { Server } from "@hocuspocus/server";

const server = new Server({
  async onAuthenticate(data) {
    const { token } = data;

    // Example test if a user is authenticated using a
    // request parameter
    if (token !== "super-secret-token") {
      throw new Error("Not authorized!");
    }

    // Example to set a document to read only for the current user
    // thus changes will not be accepted and synced to other clients
    if (someCondition === true) {
      data.connection.readOnly = true;
    }

    // You can set contextual data to use it in other hooks
    return {
      user: {
        id: 1234,
        name: "John",
      },
    };
  },
});

server.listen();
```

**Disabling authentication for some users**

Once The `onAuthenticate` hooks are configured, the server will wait for the authentication WebSocket message. If you want to override that behaviour (for some users), you can manually do that in the `onConnect` hook.

```js
import { Server } from "@hocuspocus/server";

const server = new Server({
  async onConnect({ connection }) {
    connection.requiresAuthentication = false;
  },
  async onAuthenticate() {
    // Danger! This won’t be called for that connection attempt.
  },
}).listen();
```

### onAwarenessUpdate

The `onAwarenessUpdate` hooks are called when awareness changed ([Provider Awareness API](/provider/events)).

**Hook payload**

The `data` passed to the `onAwarenessUpdate` hook has the following attributes:

```js
import { IncomingHttpHeaders } from 'http'
import { URLSearchParams } from 'url'
import { Awareness } from 'y-protocols/awareness'

const data = {
  clientsCount: number,
  context: any,
  document: Document,
  documentName: string,
  instance: Hocuspocus,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  update: Uint8Array,
  socketId: string,
  added: number[],
  updated: number[],
  removed: number[],
  awareness: Awareness,
  states: { clientId: number, [key: string | number]: any }[],

}
```

**Example**

```js
const provider = new HocuspocusProvider({
  url: "ws://127.0.0.1:1234",
  name: "example-document",
  document: ydoc,
  onAwarenessUpdate: ({ states }) => {
    currentStates = states;
  },
});
```

### onChange

The `onChange` hooks are called when the document itself has changed. It should return a Promise.

It's important to understand that this hook is called just once per document. You can use it to react to changes
by a specific connection, because we're passing `context` and `update` in the payload (see below).

It's highly recommended to debounce extensive operations as this hook can be fired up to multiple times a second.

**Hook payload**

The `data` passed to the `onChange` hook has the following attributes:

```js
import { IncomingHttpHeaders } from "http";
import { URLSearchParams } from "url";
import { Doc } from "yjs";

const data = {
  clientsCount: number,
  context: any,
  document: Doc,
  documentName: string,
  instance: Hocuspocus,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  update: Uint8Array,
  socketId: string,
};
```

Context contains the data provided in former `onConnect` hooks.

**Example**

:::warning Use a primary storage
The following example is not intended to be your primary storage as serializing to and deserializing from JSON will not store collaboration history steps but only the resulting document. This example is only meant to store the resulting document for the views of your application. For a primary storage, check out the [Database extension](/server/extensions#Database).
:::

```js
import { debounce } from "debounce";
import { Server } from "@hocuspocus/server";
import { TiptapTransformer } from "@hocuspocus/transformer";
import { writeFile } from "fs";

let debounced;

const server = new Server({
  async onChange(data) {
    const save = () => {
      // Convert the y-doc to something you can actually use in your views.
      // In this example we use the TiptapTransformer to get JSON from the given
      // ydoc.
      const prosemirrorJSON = TiptapTransformer.fromYdoc(data.document);

      // Save your document. In a real-world app this could be a database query
      // a webhook or something else
      writeFile(`/path/to/your/documents/${data.documentName}.json`, prosemirrorJSON);

      // Maybe you want to store the user who changed the document?
      // Guess what, you have access to your custom context from the
      // onConnect hook here. See authorization & authentication for more
      // details
      console.log(`Document ${data.documentName} changed by ${data.context.user.name}`);
    };

    debounced?.clear();
    debounced = debounce(save, 4000);
    debounced();
  },
});

server.listen();
```

### onConfigure

The `onConfigure` hooks are called after the server was configured using the [configure method](/server/methods). It should return a Promise.

**Default configuration**

If `configure()` is never called, you can get the default configuration by importing it:

```js
import { defaultConfiguration } from "@hocuspocus/server";
```

**Hook payload**

The `data` passed to the `onConfigure` hook has the following attributes:

```js
import { Configuration } from "@hocuspocus/server";

const data = {
  configuration: Configuration,
  version: string,
  instance: Hocuspocus,
};
```

**Example**

```js
import { Server } from "@hocuspocus/server";

const server = new Server({
  async onConfigure(data) {
    // Output some information
    console.log(`Server was configured!`);
  },
});

server.listen();
```

### onConnect

The `onConnect` hook will be called when a new connection is established. It should return a Promise. Throwing an exception or rejecting the Promise will terminate the connection.

**Hook payload**

The `data` passed to the `onConnect` hook has the following attributes:

```js
import { IncomingHttpHeaders } from "http";
import { URLSearchParams } from "url";
import { Doc } from "yjs";

const data = {
  documentName: string,
  instance: Hocuspocus,
  request: IncomingMessage,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  socketId: string,
  connection: {
    readOnly: boolean,
  },
};
```

**Example**

```js
import { Server } from "@hocuspocus/server";

const server = new Server({
  async onConnect(data) {
    // Output some information
    console.log(`New websocket connection`);
  },
});

server.listen();
```

### onDestroy

The `onDestroy` hooks are called after the server was shut down using the [destroy](/server/methods) method. It should return a Promise.

**Hook payload**

The `data` passed to the `onDestroy` hook has the following attributes:

```js
const data = {
  instance: Hocuspocus,
};
```

**Example**

```js
import { Server } from "@hocuspocus/server";

const server = new Server({
  async onDestroy(data) {
    // Output some information
    console.log(`Server was shut down!`);
  },
});

server.listen();
```

### onDisconnect

The `onDisconnect` hooks are called when a connection is terminated. It should return a Promise.

**Hook payload**

The `data` passed to the `onDisconnect` hook has the following attributes:

```js
import { IncomingHttpHeaders } from "http";
import { URLSearchParams } from "url";
import { Doc } from "yjs";

const data = {
  clientsCount: number,
  context: any,
  document: Document,
  documentName: string,
  instance: Hocuspocus,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  socketId: string,
};
```

Context contains the data provided in former `onConnect` hooks.

**Example**

```js
import { Server } from "@hocuspocus/server";

const server = new Server({
  async onDisconnect(data) {
    // Output some information
    console.log(`"${data.context.user.name}" has disconnected.`);
  },
});

server.listen();
```

### onListen

The `onListen` hooks are called after the server is started and accepts connections. It should return a Promise.

**Hook payload**

The `data` passed to the `onListen` hook has the following attributes:

```js
const data = {
  port: number,
};
```

**Example**

```js
import { Server } from "@hocuspocus/server";

const server = new Server({
  async onListen(data) {
    // Output some information
    console.log(`Server is listening on port "${data.port}"!`);
  },
});

server.listen();
```

### onLoadDocument

The `onLoadDocument` hooks are called to fetch existing data from your storage. You are probably used to loading some JSON/HTML document in your application, but that’s not the Y.js-way. For Y.js to work properly, we’ll need to store the history of changes. Only then changes from multiple sources can be merged.

You still can store a JSON/HTML document, but see it more as a “view” on your data, not as your data source.

**Create a Y.js document from JSON/HTML (once)**

You can create a Y.js document from your existing data, for example JSON. You should use this to migrate data only, not as a permanent way to store your data.

To do this, you can use the Transformer package. For Tiptap-compatible JSON it would look like this:

```js
import { TiptapTransformer } from "@hocuspocus/transformer";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";

const ydoc = TiptapTransformer.toYdoc(
  // the actual JSON
  json,
  // the `field` you’re using in Tiptap. If you don’t know what that is, use 'default'.
  "default",
  // The Tiptap extensions you’re using. Those are important to create a valid schema.
  [Document, Paragraph, Text]
);
```

If you want to import HTML, you have to [convert it to Tiptap-compatible JSON first](https://tiptap.dev/api/utilities/html/#generate-json-from-html)

However, we expect you to return a Y.js document from the `onLoadDocument` hook, no matter where it’s from.

```js
import { Server } from '@hocuspocus/server'

const server = new Server({
  async onLoadDocument(data) {
    // fetch the Y.js document from somewhere
    const ydoc = …

    return ydoc
  },
})

server.listen()
```

**Fetch your Y.js documents (recommended)**

There are multiple ways to store your Y.js documents (and their history) wherever you like. Basically, you should use the `onStoreDocument` hook, which is debounced and executed every few seconds for changed documents. It gives you the current Y.js document, and it’s up to you to store that somewhere. No worries, we provide some convenient ways for you.

If you just want to get it working, have a look at the [`SQLite`](/server/extensions#Sqlite) extension for local development, and the generic [`Database`](/server/extensions#Database) extension for a convenient way to fetch and store documents.

**Hook payload**

The `data` passed to the `onLoadDocument` hook has the following attributes:

```js
import { Doc } from "yjs";

const data = {
  context: any,
  document: Doc,
  documentName: string,
  instance: Hocuspocus,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  socketId: string,
};
```

Context contains the data provided in former `onConnect` hooks.

### afterLoadDocument

The `afterLoadDocument` hooks are called after a document is successfully loaded. This is different
to the `onLoadDocument` hooks which are part of the document creation process and could potentially
fail if for instance the document cannot be found in the database.

Because `afterLoadDocument` only runs after all `onLoadDocument` hooks are successful at this point
you know the document is considered open on the server.

**Hook payload**

The `data` passed to the `afterLoadDocument` hook has the following attributes:

```js
import { Doc } from "yjs";

const data = {
  context: any,
  document: Doc,
  documentName: string,
  instance: Hocuspocus,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  socketId: string,
};
```

### onRequest

The `onRequest` hooks are called when the HTTP server inside Hocuspocus receives a new request. It should return a Promise. If you throw an empty exception or reject the returned Promise the following hooks in the chain will not run and thus enable you to respond to the request yourself. It's similar to the concept of request middlewares.

This is useful if you want to create custom routes on the same port Hocuspocus runs on.

**Hook payload**

The `data` passed to the `onRequest` hook has the following attributes:

```js
import { IncomingMessage, ServerResponse } from "http";

const data = {
  request: IncomingMessage,
  response: ServerResponse,
  instance: Hocuspocus,
};
```

**Example**

```js
import { Server } from "@hocuspocus/server";

const server = new Server({
  onRequest(data) {
    return new Promise((resolve, reject) => {
      const { request, response } = data;

      // Check if the request hits your custom route
      if (request.url?.split("/")[1] === "custom-route") {
        // Respond with your custom content
        response.writeHead(200, { "Content-Type": "text/plain" });
        response.end("This is my custom response, yay!");

        // Rejecting the promise will stop the chain and no further
        // onRequest hooks are run
        return reject();
      }

      resolve();
    });
  },
});

server.listen();
```

### onStoreDocument

The `onStoreDocument` hooks are called after the document has been changed (after the onChange hook) and can
be used to store the changed document to a persistent storage. Calls to `onStoreDocument` are debounced by default
(see `debounce` and `maxDebounce` configuration options).

The easiest way to implement this functionality is by extending the extension `extension-database` and implementing
fetch() and store() methods, as we did that in `extension-sqlite`. You can implement the `onStoreDocument` yourself
with the hook directly, just make sure to apply / encode the states of the yDoc as we did in `extension-database`.

**Hook payload**

The `data` passed to the `onStoreDocument` hook has the following attributes:

```js
import { IncomingHttpHeaders } from "http";
import { URLSearchParams } from "url";
import { Doc } from "yjs";

const data = {
  clientsCount: number,
  context: any,
  document: Doc,
  documentName: string,
  instance: Hocuspocus,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  socketId: string,
};
```

### onUpgrade

The `onUpgrade` hooks are called when the HTTP server inside Hocuspocus receives a new upgrade request. It should return a Promise. If you throw an empty exception or reject the returned Promise the following hooks in the chain will not run and thus enable you to respond and upgrade the request yourself. It's similar to the concept of request middlewares.

This is useful if you want to create custom websocket routes on the same port Hocuspocus runs on.

**Hook payload**

The `data` passed to the `onUpgrade` hook has the following attributes:

```js
import { IncomingMessage } from "http";
import { Socket } from "net";

const data = {
  head: any,
  request: IncomingMessage,
  socket: Socket,
  instance: Hocuspocus,
};
```

**Example**

```js
import { Server } from "@hocuspocus/server";
import WebSocket, { WebSocketServer } from "ws";

const server = new Server({
  onUpgrade(data) {
    return new Promise((resolve, reject) => {
      const { request, socket, head } = data;

      // Check if the request hits your custom route
      if (request.url?.split("/")[1] === "custom-route") {
        // Create your own websocket server to upgrade the request, make
        // sure noServer is set to true, because we're handling the upgrade
        // ourselves
        const websocketServer = new WebSocketServer({ noServer: true });
        websocketServer.on("connection", (connection: WebSocket, request: IncomingMessage) => {
          // Put your application logic here to respond to new connections
          // and subscribe to incoming messages
          console.log("A new connection to our websocket server!");
        });

        // Handle the upgrade request within your own websocket server
        websocketServer.handleUpgrade(request, socket, head, (ws) => {
          websocketServer.emit("connection", ws, request);
        });

        // Rejecting the promise will stop the chain and no further
        // onUpgrade hooks are run
        return reject();
      }

      resolve();
    });
  },
});

server.listen();
```


### onStateless

The `onStateless` hooks are called after the server has received a stateless message. It should return a Promise.

**Hook payload**

The `data` passed to the `onListen` hook has the following attributes:

```js
const data = {
  connection: Connection,
  documentName: string,
  document: Document,
  payload: string,
}
```

**Example**

```js
import { Server } from '@hocuspocus/server'

const server = new Server({
  async onStateless({ payload, document, connection }) {
    // Output some information
    console.log(`Server has received a stateless message "${payload}"!`)
    // Broadcast a stateless message to all connections based on document
    document.broadcastStateless('This is a broadcast message.')
    // Send a stateless message to a specific connection
    connection.sendStateless('This is a specific message.')
  },
})

server.listen()
```

### beforeBroadcastStateless

The `beforeBroadcastStateless` hooks are called before the server broadcast a stateless message.

**Hook payload**

The `data` passed to the `beforeBroadcastStateless` hook has the following attributes:

```js
import { Doc } from 'yjs'

const data = {
  documentName: string,
  document: Doc,
  payload: string,
}
```

**Example**

```js
import { Server } from '@hocuspocus/server'

const server = new Server({
  beforeBroadcastStateless({ payload }) {
    console.log(`Server will broadcast a stateless message: "${payload}"!`)
  },
})

server.listen()
```

### afterUnloadDocument

The `afterUnloadDocument` hooks are called after a document was closed on the server. You can no
longer access the document at this point as it has been destroyed, but you may notify anything
that was subscribed to the document.

Note: `afterUnloadDocument` may be called even if `afterLoadDocument` never was for a given document
as an extension may have aborted the loading of the document during the `onLoadDocument` phase.

**Hook payload**

The `data` passed to the `onDestroy` hook has the following attributes:

```js
const data = {
  instance: Hocuspocus,
  documentName: string,
};
```

**Example**

```js
import { Server } from "@hocuspocus/server";

const server = new Server({
  async afterUnloadDocument(data) {
    // Output some information
    console.log(`Document ${data.documentName} was closed`);
  },
});

server.listen();
```
