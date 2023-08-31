# Upgrade Guide

## Upgrading to 3.0 from 2.x

With the upgrade to the new version, the initialization of hocuspocus has changed. As described on the [usage](/server/usage)
side, there are two ways on how you can use hocuspocus. With the built-in server. Or like a library for with other
frameworks (like [express](/server/examples#express)). To make things simpler and enable more features in the future,
we seperated classes and put the server into its own class.

### Usage with .configure()

It is no longer possible to use hocuspocus with `.configure()`. You always have to create a new instance by yourself.

**Old way**
```js
import { Server } from "@hocuspocus/server";

const server = Server.configure({
  port: 1234,
});

server.listen();
```

**New way**
```js
import { Server } from "@hocuspocus/server";

const server = new Server({
  port: 1234,
});

server.listen();
```

Notice, that the import has not changed here.

### Usage of Hocuspocus without built-in server

If you have used Hocuspocus without the built-in server before, you have to update your setup as well.

**Old way**
```js
import { Server } from "@hocuspocus/server";

const server = Server.configure({
  // ...
});
```

**New way**
```js
import { Hocuspocus } from "@hocuspocus/server";

const hocuspocus = new Hocuspocus({
  // ...
});

// You still use handleConnection as you did before.
hocuspocus.handleConnection(...);
```

Notice the change of the import from `Server` to `Hocuspocus` as well as the initialization with `new Hocuspocus()`.
See [examples](/server/examples) for more on that.
