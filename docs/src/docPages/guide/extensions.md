# Extensions

## toc

## Introduction

Extensions are a quick way to add additional features to hocuspocus. They use the same API and the same hooks you saw in the previous chapters.

## Official extensions

### @hocuspocus/leveldb

By default, hocuspocus stores documents in memory only, so they will be deleted when the server is stopped. It’s probably sufficient for your first experiments, but it’s unlikely that you want this behavior in a production environment.

LevelDB is fast key-value storage written at Google and RocksDB is Facebook's fork of it which has some significant advantages over the original one (mainly speed, concurrency and backups).

With this extension, document changes can be easily stored on the hard disk using either LevelDB or RocksDB. When you restart the server, it’ll restore documents from the hard disk. It's the quickest and easiest way to persist documents.

:::warning RocksDB vs. LevelDB
The API may be the same, but the data stored on your hard drive isn't. You cannot change from one to the other without losing your data. So choose one from the beginning and stick with it.
:::

#### Installation

// TODO

#### Configuration

In this example we configured the LevelDB extension to persist data in the `./database` folder. All other configuration options are optional:

```js
import { Server } from '@hocuspocus/server'
import { LevelDB } from '@hocuspocus/leveldb'

const server = Server.configure({

  extensions: [
    new LevelDB({
      // [required] Path to the directory to store the actual data in
      path: './database',

      // [optional] Wether to use RocksDB or the original LevelDB, defaults to "true"
      useRocksDB: true,

      // [optional] Configuration options for the LevelDB/RocksDB adapter, defaults to "{}“
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

The only way to properly backup LevelDB is to shut down the server, copy the files and start it again. This is a deal-breaker, so we decided to use RocksDB by default which allows backups while the server is running.

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

```typescript
import {
  Extension,
  onChangePayload,
  onConnectPayload,
  onCreateDocumentPayload,
  onDisconnectPayload,
} from '@hocuspocus/server'

export class MyHocuspocusExtension implements Extension {

  onCreateDocument(data: onCreateDocumentPayload): void {}

  onChange(data: onChangePayload): void {}

  onConnect(data: onConnectPayload, resolve: Function, reject: Function): void {}

  onDisconnect(data: onDisconnectPayload): void {}

}
```

Notice something? These look like the hooks we introduced in the previous chapters of the guide. And guess what: they work the same way as those hooks. So you should already know what they do and how you can use them. If you're still not sure, check out the API section of this documentation which explains them in more detail.

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
  onCreateDocument(data: onCreateDocumentPayload): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onChange(data: onChangePayload): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onConnect(data: onConnectPayload, resolve: Function, reject: Function): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onDisconnect(data: onDisconnectPayload): void {}

}
```

That's it. The only thing missing now is your code. Happy extension writing! When you're done you can simply import and register your extension like any other:

```js
import { Server } from '@hocuspocus/server'
import { MyHocuspocusExtension } from './extension/my-hocuspocus-extension'

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
