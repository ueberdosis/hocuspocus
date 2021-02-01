import {
  Server, onChangePayload, onDisconnectPayload, onConnectPayload,
} from '@hocuspocus/server'
import { LevelDB } from '@hocuspocus/leveldb'

const server = Server.configure({

  port: 1234,

  extensions: [
    new LevelDB({ path: './database' }),
  ],

  onConnect(data: onConnectPayload, resolve: Function, reject: Function) {
    console.log('connected')

    resolve()
  },

  onChange(data: onChangePayload) {
    console.log('changed')

    // do something with the data
    // console.log(`${data.documentName} was sent to an API!`)
  },

  onDisconnect(data: onDisconnectPayload) {
    console.log('disconnected')

    // handle disconnect
    // console.log(`User ${data.context.user_id} disconnected from ${data.documentName}`)
  },
})

server.listen()
