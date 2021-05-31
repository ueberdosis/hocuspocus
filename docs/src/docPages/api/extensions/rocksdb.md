# RocksDB

## toc

## Introduction

By default, hocuspocus stores documents and the collaboration history in memory only, so everything will be deleted when the server is stopped. It’s probably sufficient for your first experiments, but it’s unlikely that you want this behavior in a production environment.

RocksDB is an incredibly fast key-value storage - a fork of Google's LevelDB - maintained at Facebook which allows multi-threading and backups while the server is running.

With this extension, documents and the collaboration history can be easily stored on the disk. When you restart the server, it’ll restore documents and the history from it. It's the quickest and easiest way to persist documents and updates and should be used in **every production instance** as primary storage!

## Installation

Install the RocksDB package with:

```bash
# with npm
npm install @hocuspocus/extension-rocksdb

# with Yarn
yarn add @hocuspocus/extension-rocksdb
```

## Configuration

In this example we configured the RocksDB extension to persist data in the `./database` folder. All other configuration options are optional:

```js
import { Server } from '@hocuspocus/server'
import { RocksDB } from '@hocuspocus/extension-rocksdb'

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

## Backups

You can use the [RocksDB API in C++ or Java](https://rocksdb.org/blog/2014/03/27/how-to-backup-rocksdb.html) to write your own backup script or use [this simple CLI written](https://github.com/indix/rocks) in go which has precompiled binaries for 64bit Linux systems.

```bash
# Install the rocks cli by downloading it to your machine and making it executable
curl -o /usr/local/bin/rocks -L https://github.com/indix/rocks/releases/download/v0.0.5/rocks-linux-amd64 \
  && chmod +x /usr/local/bin/rocks

# Run a single backup
rocks backup --src=/path/to/your/database --dest=/path/to/your/backups
```

The CLI can also restore backups with the `rocks restore` command. Backups are always incremental, so the only thing you have to do next, is adding the backup line above to your crontab and you're done.
