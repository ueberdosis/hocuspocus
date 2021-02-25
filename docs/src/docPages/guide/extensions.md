# Extensions

## toc

## Introduction

Extensions are a quick way to add additional features to hocuspocus. They use the same API and the same hooks you saw in the previous chapters.

## Official extensions

### @hocuspocus/rocksdb

By default, hocuspocus stores documents in memory only, so they will be deleted when the server is stopped. It’s probably sufficient for your first experiments, but it’s unlikely that you want this behavior in a production environment.

RocksDB is an incredibly fast key-value storage - a fork of Google's LevelDB - maintained at Facebook which allows multi-threading and backups while the server is running.

With this extension, document changes can be easily stored on the hard disk. When you restart the server, it’ll restore documents from the hard disk. It's the quickest and easiest way to persist documents.

#### Installation

// TODO

#### Configuration

In this example we configured the RocksDB extension to persist data in the `./database` folder. All other configuration options are optional:

```js
import { Server } from '@hocuspocus/server'
import { RocksDB } from '@hocuspocus/rocksdb'

const server = Server.configure({

  extensions: [
    new RocksDB({
      // [required] Path to the directory to store the actual data in
      path: './database',

      // [optional] Configuration options for theRocksDB adapter, defaults to "{}“
      options: {
        // This option is only a example. See here for a full list:
        // https://www.npmjs.com/package/leveldown#options
        createIfMissing: true,
      },
    })
  ],

})

server.listen()
```

#### Backups

You can use the [RocksDB API in C++ or Java](https://rocksdb.org/blog/2014/03/27/how-to-backup-rocksdb.html) to write your own backup script or use [this simple CLI written](https://github.com/indix/rocks) in go which has precompiled binaries for 64bit Linux systems.

```bash
# Install the rocks cli by downloading it to your machine and making it executable
curl -o /usr/local/bin/rocks -L https://github.com/indix/rocks/releases/download/v0.0.5/rocks-linux-amd64 \
  && chmod +x /usr/local/bin/rocks

# Run a single backup
rocks backup --src=/path/to/your/database --dest=/path/to/your/backups
```

The CLI can also restore backups with the `rocks restore` command. Backups are always incremental, so the only thing you have to do next, is adding the backup line above to your crontab and you're done.

### @hocuspocus/redis

hocuspocus can be scaled indefinitely using the official Redis extension. You can spawn multiple instances of the server behind a load balancer and sync changes between the instances through Redis pub/sub.

:::warning Work in progress
Currently, the Redis extension only syncs document changes. Awareness states, for example cursors, are not yet supported.
:::

#### Installation

// TODO

#### Configuration

For a full documentation on all available redis and redis cluster options, check out the [ioredis API docs](https://github.com/luin/ioredis/blob/master/API.md).

```js
import { Server } from '@hocuspocus/server'
import { Redis } from '@hocuspocus/redis'

const server = Server.configure({
  extensions: [
    new Redis({
      // [required] Hostname of your Redis instance
      host: '127.0.0.1',
      // [required] Port of your Redis instance
      port: 6379,
    })
  ],
})

server.listen()
```

If you want to use a cluster instead of a single Redis instance, use the Redis cluster extension:

```js
import { Server } from '@hocuspocus/server'
import { RedisCluster } from '@hocuspocus/redis'

const server = Server.configure({
  extensions: [
    new RedisCluster({
      scaleReads: 'all',
      redisOptions: {
        host: '127.0.0.1',
        port: 6379,
      },
    })
  ],
})

server.listen()
```

## Create your own extension

hocuspocus is written in TypeScript. You don't have to use TypeScript to write extensions, but it's highly recommended. We will only cover the TypeScript part in this documentation.

First step: Create a new class that implements the `Extension` interface and add the method stubs the interface requires.

As every hook needs to return a Promise, the easiest way is to mark them as `async`.

```typescript
import {
  Extension,
  onChangePayload,
  onConnectPayload,
  onCreateDocumentPayload,
  onDisconnectPayload,
} from '@hocuspocus/server'

export class MyHocuspocusExtension implements Extension {

  async onCreateDocument(data: onCreateDocumentPayload): Promise<void> {}

  async onChange(data: onChangePayload): Promise<void> {}

  async onConnect(data: onConnectPayload): Promise<void> {}

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
  onCreateDocumentPayload,
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
  async onCreateDocument(data: onCreateDocumentPayload): Promise<void> {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async onChange(data: onChangePayload): Promise<void> {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async onConnect(data: onConnectPayload): Promise<void> {}

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
