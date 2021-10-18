import { Logger } from '@hocuspocus/extension-logger'
import { Server } from '@hocuspocus/server'
import { Monitor } from '@hocuspocus/extension-monitor'

const server = Server.configure({
  port: 1234,
  extensions: [
    new Logger(),
    new Monitor(),
  ],
})

server.listen()
