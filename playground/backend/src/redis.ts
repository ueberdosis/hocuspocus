import { Hocuspocus } from '@hocuspocus/server'
import { Logger } from '@hocuspocus/extension-logger'
import { Redis } from '@hocuspocus/extension-redis'

const server = new Hocuspocus().configure({
  port: 1234,

  extensions: [
    new Logger(),
    new Redis({
      host: '127.0.0.1',
      port: 6379,
    }),
  ],
})

server.listen()

const anotherServer = new Hocuspocus().configure({
  port: 1235,

  extensions: [
    new Logger(),
    new Redis({
      host: '127.0.0.1',
      port: 6379,
    }),
  ],
})

anotherServer.listen()
