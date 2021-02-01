import { LevelDB } from '@hocuspocus/leveldb'
import {
  Server,
  onChangePayload,
  onDisconnectPayload,
  onConnectPayload,
  onCreateDocumentPayload,
} from '@hocuspocus/server'

const server = Server.configure({

  port: 1234,

  extensions: [
    new LevelDB({ path: './database' }),
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
