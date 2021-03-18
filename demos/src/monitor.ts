import { Logger } from '../../packages/logger/src'
import { Monitor } from '../../packages/monitor/src'
import { Server } from '../../packages/server/src'

const server = Server.configure({
  extensions: [
    new Logger(),
    new Monitor(),
  ],
})

server.listen()
