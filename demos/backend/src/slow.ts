import { Logger } from '@hocuspocus/extension-logger'
import { RocksDB } from '@hocuspocus/extension-rocksdb'
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  port: 1234,
  extensions: [
    new Logger(),
    new RocksDB({
      path: './rocksdb',
    }),
  ],

  async onConnect(data) {
    // simulate a very slow authentication process that takes 10 seconds (or more if you want to type more)
    await new Promise((resolve: Function) => {
      setTimeout(() => { resolve() }, 10000)
    })

    return true
  },
})

server.listen()
