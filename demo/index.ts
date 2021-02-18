import { Doc } from 'yjs'
import { LevelDB } from '../packages/leveldb/src'
import { Logger } from './utils/logger'
import { Server, onCreateDocumentPayload } from '../packages/server/src'

const server = Server.configure({
  port: 1234,
  extensions: [
    new Logger(),
    new LevelDB({
      path: './database',
    }),
  ],

  onCreateDocument(data: onCreateDocumentPayload, resolve: Function): void {
    const doc = new Doc()

    resolve(doc)
  },
})

server.listen()
