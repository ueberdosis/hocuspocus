import { Server } from '@hocuspocus/server'
import { Logger } from '@hocuspocus/extension-logger'
import { Redis } from '@hocuspocus/extension-redis'

const server = Server.configure({
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
