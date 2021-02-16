import { LevelDB } from '../packages/leveldb/src'
import { Logger } from './utils/logger'
import { Server } from '../packages/server/src'

const server = Server.configure({
  port: 1234,
  extensions: [
    new Logger(),
    new LevelDB({
      path: './database',
    }),
  ],
})

server.listen()
