# Extensions

## toc

## Introduction

Extensions are a quick way to add additional features to hocuspocus. They use the same API and the same hooks you saw in the previous chapters.

## Official extensions

### @hocuspocus/leveldb

By default, hocuspocus stores documents in memory only, so they will be deleted when the server is stopped. It’s probably sufficient for your first experiments, but it’s unlikely that you want this behavior in a production environment.

LevelDB is fast key-value storage written at Google and RocksDB is Facebook's fork of it which has some significant advantages over the original one (mainly speed, concurrency and backups).

With this extension, document changes can be easily stored on the hard disk. When you restart the server, it’ll restore documents from the hard disk. It's the quickest and easiest way to persist documents.

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
      }
    })
  ],

})

server.listen()
```

#### Backups

The only way to properly backup LevelDB is to shut down the server, copy the files and start it again. This is a deal-breaker, so we decided to use RocksDB by default which allows backups while the server is running.

You can use the [RocksDB API in C++ or Java](https://rocksdb.org/blog/2014/03/27/how-to-backup-rocksdb.html) to write your own backup script or use [this simple CLI written](https://github.com/indix/rocks) in go which has precompiled binaries for 64bit Linux systems.

```bash
# Install the rocks cli by downloading it to your machine and make it executable
curl -o /usr/local/bin/rocks -L https://github.com/indix/rocks/releases/download/v0.0.5/rocks-linux-amd64 \
    && chmod +x /usr/local/bin/rocks

# Run a single backup
rocks backup --src=/path/to/your/database --dest=/path/to/your/backups
```

The CLI can also restore backups with the `rocks restore` command. Backups are always incremental, so the only thing you have to do next, is adding the `rocks backup # ...` line to your crontab and you're done.

### Redis extension

// TODO

## Create your own extension

// TODO
