---
tableOfContents: true
---

# Custom Extensions

## Official extensions

You can see the extensions we have already created [here](/server/extensions).

## Create your own extension

Hocuspocus is written in TypeScript. You don't have to use TypeScript to write extensions, but it's highly recommended. We will only cover the TypeScript part in this documentation.

First step: Create a new class that implements the [`Extension`](https://github.com/ueberdosis/hocuspocus/blob/14e5676ff685a1432d87fed780b6cbead12c8122/packages/server/src/types.ts#L35-L57) interface and add the desired hooks.

As every hook needs to return a Promise, the easiest way is to mark them as `async`.

```js
import {
  Extension,
  onChangePayload,
  onConnectPayload,
  onAuthenticatePayload,
  onLoadDocumentPayload,
  onDisconnectPayload,
} from "@hocuspocus/server";

export class MyHocuspocusExtension implements Extension {
  async onLoadDocument(data: onLoadDocumentPayload): Promise<void> {}

  async onChange(data: onChangePayload): Promise<void> {}

  async onConnect(data: onConnectPayload): Promise<void> {}

  async onAuthenticate(data: onAuthenticatePayload): Promise<void> {}

  async onDisconnect(data: onDisconnectPayload): Promise<void> {}

  async onRequest(data: onRequestPayload): Promise<void> {}

  async onUpgrade(data: onUpgradePayload): Promise<void> {}

  async onListen(data: onListenPayload): Promise<void> {}

  async onDestroy(data: onDestroyPayload): Promise<void> {}

  async onConfigure(data: onConfigurePayload): Promise<void> {}
}
```

Notice something? These look like the hooks we introduced in the previous chapters of the guide. And guess what: they work the same way as those hooks. So you should already know what they do and how you can use them. If you're still not sure, check out the [hooks](/server/hooks) section of this documentation which explains them in more detail.

Now you can add a constructor that accepts your extension's configuration and merges the default one. It's good practise at this point to create an interface for your configuration too.

```js
import {
  Extension,
  onChangePayload,
  onConnectPayload,
  onAuthenticatePayload,
  onLoadDocumentPayload,
  onDisconnectPayload,
} from "@hocuspocus/server";

export interface Configuration {
  myConfigurationOption: string;
  myOptionalConfigurationOption: number | undefined;
}

export class MyHocuspocusExtension implements Extension {
  configuration: Configuration = {
    myConfigurationOption: "foobar",
    myOptionalConfigurationOption: 42,
  };

  constructor(configuration?: Partial<Configuration>) {
    this.configuration = { ...this.configuration, ...configuration };
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async onLoadDocument(data: onLoadDocumentPayload): Promise<void> {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async onChange(data: onChangePayload): Promise<void> {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async onConnect(data: onConnectPayload): Promise<void> {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async onAuthenticate(data: onAuthenticatePayload): Promise<void> {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async onDisconnect(data: onDisconnectPayload): Promise<void> {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async onRequest(data: onRequestPayload): Promise<void> {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async onUpgrade(data: onUpgradePayload): Promise<void> {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async onListen(data: onListenPayload): Promise<void> {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async onDestroy(data: onDestroyPayload): Promise<void> {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async onConfigure(data: onConfigurePayload): Promise<void> {}
}
```

That's it. The only thing missing now is your code. Happy extension writing! When you're done you can simply import and register your extension like any other:

```js
import { Server } from "@hocuspocus/server";
import { MyHocuspocusExtension } from "./extensions/my-hocuspocus-extension";

const server = Server.configure({
  extensions: [
    new MyHocuspocusExtension({
      myConfigurationOption: "baz",
      myOptionalConfigurationOption: 1337,
    }),
  ],
});

server.listen();
```
