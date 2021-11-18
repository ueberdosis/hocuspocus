# Extensions

## toc

## Introduction

Extensions are a quick way to add additional features to Hocuspocus. They use the same API and the same hooks you saw in the previous chapters.

## Official extensions

We already created some very useful extensions you should check out for sure:

**[@hocuspocus/extension-rocksdb](/api/extensions/rocksdb)**: An easy to use primary storage for Hocuspocus.

**[@hocuspocus/extension-monitor](/api/extensions/monitor)**: A beautiful dashboard to monitor and debug your Hocuspocus instance.

**[@hocuspocus/extension-redis](/api/extensions/redis)**: Scale Hocuspocus horizontally with redis.

**[@hocuspocus/extension-logger](/api/extensions/logger)**: Add logging to Hocuspocus.

**[@hocuspocus/extension-pubsub](/api/extensions/pubsub)**: Horizontally scale using Redis.

**[@hocuspocus/extension-webhook](/api/extensions/webhook)**: Send document changes via webhook to your API.

**[@hocuspocus/extension-throttle](/api/extensions/throttle)**: Throttle connections by ips.

## Create your own extension

hocuspocus is written in TypeScript. You don't have to use TypeScript to write extensions, but it's highly recommended. We will only cover the TypeScript part in this documentation.

First step: Create a new class that implements the `Extension` interface and add the method stubs the interface requires.

As every hook needs to return a Promise, the easiest way is to mark them as `async`.

```typescript
import {
  Extension,
  onChangePayload,
  onConnectPayload,
  onAuthenticatePayload,
  onLoadDocumentPayload,
  onDisconnectPayload,
} from '@hocuspocus/server'

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

Notice something? These look like the hooks we introduced in the previous chapters of the guide. And guess what: they work the same way as those hooks. So you should already know what they do and how you can use them. If you're still not sure, check out the HOOKS section of this documentation which explains them in more detail.

Now you can add a constructor that accepts your extension's configuration and merges the default one. It's good practise at this point to create an interface for your configuration too.

You need to keep all those methods, even if you don't use them. If you want to get rid of those annoying TypeScript warnings about empty functions, you can add the `@typescript-eslint/no-empty-function` annotation.

```typescript
import {
  Extension,
  onChangePayload,
  onConnectPayload,
  onAuthenticatePayload,
  onLoadDocumentPayload,
  onDisconnectPayload,
} from '@hocuspocus/server'

export interface Configuration {
  myConfigurationOption: string,
  myOptionalConfigurationOption: number | undefined,
}

export class MyHocuspocusExtension implements Extension {

  configuration: Configuration = {
    myConfigurationOption: 'foobar',
    myOptionalConfigurationOption: 42,
  }

  constructor(configuration ?: Partial<Configuration>) {
    this.configuration = { ...this.configuration, ...configuration }
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
import { Server } from '@hocuspocus/server'
import { MyHocuspocusExtension } from './extensions/my-hocuspocus-extension'

const server = Server.configure({
  extensions: [
    new MyHocuspocusExtension({
      myConfigurationOption: 'baz',
      myOptionalConfigurationOption: 1337,
    })
  ],
})

server.listen()
```
