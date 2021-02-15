import { LevelDB } from '../packages/leveldb/src'
import {
  Server,
  onChangePayload,
  onDisconnectPayload,
  onConnectPayload,
  onCreateDocumentPayload,
} from '../packages/server/src'

const server = Server.configure({

  port: 1234,

  extensions: [
    new LevelDB({
      path: './database',
      useRocksDB: true,
    }),
  ],

  onCreateDocument(data: onCreateDocumentPayload) {
    console.log('document created')
  },

  onConnect(data: onConnectPayload, resolve: Function, reject: Function) {
    console.log('connected')

    resolve()
  },

  onChange(data: onChangePayload) {
    console.log('changed')
  },

  onDisconnect(data: onDisconnectPayload) {
    console.log('disconnected')
  },
})

server.listen()
