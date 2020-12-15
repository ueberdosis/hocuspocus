# Persistence
By default, documents are only stored in the memory. Hence they are deleted when the WebSocket server is stopped. To prevent this, store changes on the hard disk with the LevelDB adapter. When you restart the server, it’ll restore documents from the hard disk, in that case from the `./database` folder:

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
