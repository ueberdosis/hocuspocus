import { Hocuspocus } from '@hocuspocus/server'
import { Logger } from '@hocuspocus/extension-logger'
import { Redis } from '@hocuspocus/extension-redis'
import { SQLite } from '@hocuspocus/extension-sqlite'

const server = new Hocuspocus({
  port: 1234,
  name: 'redis-1',
  extensions: [
    new Logger(),
    new Redis({
      host: '127.0.0.1',
      port: 6379,
    }),
    new SQLite(),
  ],
})

server.listen()

const anotherServer = new Hocuspocus({
  port: 1235,
  name: 'redis-2',
  extensions: [
    new Logger(),
    new Redis({
      host: '127.0.0.1',
      port: 6379,
    }),
    new SQLite(),
  ],

  // onAwarenessUpdate: async ({ documentName, states }) => {
  //   console.log('onAwarenessUpdate', documentName, states)
  // },
})

anotherServer.listen()
