---
tableOfContents: true
---

# Authentication & Authorization

## Introduction

With the `onAuthenticate` hook you can check if a client is authenticated and authorized to view the current document. In a real world application this would probably be a request to an API, a database query or something else.

## Example

When throwing an error or rejecting the returned Promise, the connection to the client will be terminated (see [server hooks lifecycle](/server/hooks#lifecycle)). If the client is authorized and authenticated you can also return contextual data such as a user id which will be accessible in other hooks. But you don’t need to.

For more information on the hook and it's payload checkout it's [section](/server/hooks#on-authenticate).

```js
import { Server } from "@hocuspocus/server";

const server = new Server({
  async onAuthenticate(data) {
    const { token } = data;

    // Example test if a user is authenticated with a token passed from the client
    if (token !== "super-secret-token") {
      throw new Error("Not authorized!");
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

On the client you would pass the "token" parameter as one of the Hocuspocus options, like so:

```js
new HocuspocusProvider({
  url: "ws://127.0.0.1:1234",
  name: "example-document",
  document: ydoc,
  token: "super-secret-token",
});
```

## Read only mode

If you want to restrict the current user only to read the document and it's updates but not apply
updates him- or herself, you can use the `connection` property in the `onAuthenticate` hooks payload:

```js
import { Server } from "@hocuspocus/server";

const usersWithWriteAccess = ["jane", "john", "christina"];

const server = new Server({
  async onAuthenticate(data): Doc {
    // Example code to check if the current user has write access by a
    // request parameter. In a real world application you would probably
    // get the user by a token from your database
    if (!usersWithWriteAccess.includes(data.requestParameters.get("user"))) {
      // Set the connection to readonly
      data.connection.readOnly = true;
    }
  },
});

server.listen();
```
