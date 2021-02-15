# Extensions

## toc

## Introduction

Extensions are a quick way to add additional features to hocuspocus. They use the same API and the same hooks you saw in the previous chapters.

## Official extensions

### LevelDB persistence

By default, hocuspocus stores documents in memory only, so they will be deleted when the server is stopped. It’s probably sufficient for your first experiments, but it’s unlikely that you want this behavior in a production environment.

LevelDB is fast key-value storage written at Google. With the LevelDB persistence adapter document changes are stored on the hard disk. When you restart the server, it’ll restore documents from the hard disk.

#### Configuration

In this example we configured the LevelDB extension to persist data in the `./database` folder:

```js
import { Server } from '@hocuspocus/server'
import { LevelDB } from '@hocuspocus/leveldb'

const server = Server.configure({

  extensions: [
    new LevelDB({ path: './database' })
  ],

})

server.listen()
```

#### Backups

Coming soon…

* Shutdown the server
* Copy files & folders
* Start the server

https://blog.senx.io/demystifying-leveldb/
https://stackoverflow.com/a/18167774


### Redis extension

Coming soon…

## Create your own extension

Coming soon…
