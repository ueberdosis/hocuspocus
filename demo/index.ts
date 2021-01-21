import {
  Server, onChangePayload, onDisconnectPayload, onConnectPayload,
} from '@hocuspocus/server/src'
import { LevelDB } from '@hocuspocus/leveldb/src'

const server = Server.configure({

  port: 1234,

  persistence: new LevelDB({
    path: './database',
  }),

  onConnect(data: onConnectPayload, resolve: Function, reject: Function) {
    // authenticate using request headers
    // if (data.requestHeaders.access_token === 'super-secret-token') {
    //   return reject()
    // }
    //
    // // set context for later usage
    // const context = { user_id: 1234 }
    //
    // // authorize user
    // if (context.user_id !== 1234) {
    //   return reject()
    // }

    resolve()
  },

  onChange(data: onChangePayload) {

    // do something with the data
    // console.log(`${data.documentName} was sent to an API!`)
  },

  onDisconnect(data: onDisconnectPayload) {
    // handle disconnect
    // console.log(`User ${data.context.user_id} disconnected from ${data.documentName}`)
  },
})

server.listen()
