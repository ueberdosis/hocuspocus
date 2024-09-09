# Extension Logger

Hocuspocus doesn’t log anything. Thanks to this simple extension it will.

## Installation

Install the Logger package with:

```bash
npm install @hocuspocus/extension-logger
```

## Configuration

**Instance name**

You can prepend all logging messages with a configured string.

```js
import { Server } from "@hocuspocus/server";
import { Logger } from "@hocuspocus/extension-logger";

const server = new Server({
  name: "hocuspocus-fra1-01",
  extensions: [new Logger()],
});

server.listen();
```

**Disable messages**

You can disable logging for specific messages.

```js
import { Server } from "@hocuspocus/server";
import { Logger } from "@hocuspocus/extension-logger";

const server = new Server({
  extensions: [
    new Logger({
      onLoadDocument: false,
      onChange: false,
      onConnect: false,
      onDisconnect: false,
      onUpgrade: false,
      onRequest: false,
      onListen: false,
      onDestroy: false,
      onConfigure: false,
    }),
  ],
});

server.listen();
```

**Custom logger**

You can even pass a custom function to log messages.

```js
import { Server } from "@hocuspocus/server";
import { Logger } from "@hocuspocus/extension-logger";

const server = new Server({
  extensions: [
    new Logger({
      log: (message) => {
        // do something custom here
        console.log(message);
      },
    }),
  ],
});

server.listen();
```
