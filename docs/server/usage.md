---
tableOfContents: true
---

# Usage

There are two ways on how you can use hocuspocus. Either with the built-in server. Or with another framework, for
example with [Express](/server/examples#express).

## Hocuspocus Server

Using the built-in server make sure to import `Server` from `@hocuspocus/server`. You configure the server as described
under [configuration](/server/configuration). The built-in server spins up a webserver and a websocket server.

```js
import { Server } from "@hocuspocus/server";

// Configure the server
const server = new Server({
  port: 1234,
});

// Listen …
server.listen();

// Destroy …
server.destroy();
```

You can access the instance of hocuspocus through the webserver to call it's [methods](/server/methods).

```js
// …

server.hocuspocus.getDocumentsCount();
```

## Hocuspocus

As mentioned earlier, you can use hocuspocus without the built-in server. Make sure to import `Hocuspocus` from the
`@hocuspocus/server` package.

```js
import { Hocuspocus } from "@hocuspocus/server";

// Configure hocuspocus
const hocuspocus = new Hocuspocus({
  name: "hocuspocus-fra1-01",
})

// …
```

Check out the [examples](/server/examples) to learn more.
