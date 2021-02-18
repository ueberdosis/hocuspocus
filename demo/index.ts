import { Doc } from 'yjs'
import { Monitor } from '../packages/monitor/src'
import { LevelDB } from '../packages/leveldb/src'
import { Logger } from './utils/logger'
import { Server, onCreateDocumentPayload } from '../packages/server/src'

const server = Server.configure({
  port: 1234,
  extensions: [
    new Monitor(),
    new Logger(),
    // new LevelDB({
    //   path: './database',
    // }),
  ],
})

server.listen()
