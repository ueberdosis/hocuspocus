import { Server } from '@hocuspocus/server'
import { Logger } from '@hocuspocus/extension-logger'
import { Monitor } from '@hocuspocus/extension-monitor'

const server = Server.configure({
  port: 1234,
  name: 'my-unique-identifier',
  extensions: [
    new Logger(),
    new Monitor(),
  ],
})

server.listen()
