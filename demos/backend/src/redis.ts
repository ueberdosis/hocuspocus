import { Server } from '../../../packages/server/src'
import { Logger } from '../../../packages/logger/src'
import { Redis } from '../../../packages/redis/src'

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
