import { Logger } from '../../packages/logger/src'
import { Server } from '../../packages/server/src'

const server = Server.configure({
  port: 1234,
  throttle: false,

  extensions: [
    new Logger(),
  ],
})

server.listen()
