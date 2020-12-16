# Persistence

## toc

## Introduction
By default, hocuspocus store documents in the memory only. Hence they are deleted when the server is stopped. It’s probably sufficient for your first experiments, but it’s unlikely that you want this behaviour in a production environment.

No worries, though. You can use a persistence driver to store and restore changes, for example from the hard disk.

## LevelDB
LevelDB is fast key-value storage written at Google. With the LevelDB persistence adapter document changes are stored on the hard disk.

When you restart the server, it’ll restore documents from the hard disk, in the following example from the `./database` folder:

```js
import { Server } from '@hocuspocus/server'
import { LevelDB } from '@hocuspocus/leveldb'

const server = Server.configure({
  persistence: new LevelDB({
    path: './database',
  }),
})

server.listen()
```

That’s also the exact same backend code that we use for all examples here. Nice, isn’t it?

### Backups
TODO

### Initial import
TODO
