# Upgrade Guide

## Upgrading to 3.0 from 2.x

With the upgrade to the new version, the initialization of hocuspocus has changed. As described on the [usage](/server/usage)
side, there are two ways on how you can use hocuspocus. With the built-in server. Or like a library with other
frameworks (like [express](/server/examples#express)). To make things simpler and enable more features in the future,
we seperated classes and put the server into its own class.

### Usage with .configure()

It is no longer possible to use hocuspocus with `.configure()`. You always have to create a new instance by yourself.

**Old Way**
```js
import { Server } from "@hocuspocus/server";

const server = Server.configure({
  port: 1234,
});

server.listen();
```

**New Way**
```js
import { Server } from "@hocuspocus/server";

const server = new Server({
  port: 1234,
});

server.listen();
```

Notice, that the import has not changed. The configuration options stay the same here.

### Usage of Hocuspocus without built-in server

If you have used Hocuspocus without the built-in server before, you have to update your setup as well.

**Old Way**
```js
import { Server } from "@hocuspocus/server";

const server = Server.configure({
  // ...
});
```

**New Way**
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

### Change of the servers listen signature

The `.listen()` function of the server was quite versatile. We simplified the signature of it while you can still reach
the same behavior as before.

**Old Signature**
```js
async listen(
    portOrCallback: number | ((data: onListenPayload) => Promise<any>) | null = null,
    callback: any = null,
): Promise<Hocuspocus>
```

**New Signature**
```js
async listen(port?: number, callback: any = null): Promise<Hocuspocus>
```

The listen method still returns a Promise which will be resolved to Hocuspocus, if nothing fails.

Both the callbacks you could provide in the old version were added to the `onListen` hook. This is still the case with
the callback on the new version. But you can't provide just a callback on the first parameter anymore. If you just want
to add a callback you also still can add it within the configuration of the server.

```js
import { Server } from "@hocuspocus/server";

const server = new Server({
  async onListen(data) {
    console.log(`Server is listening on port "${data.port}"!`);
  },
});

server.listen()
```
