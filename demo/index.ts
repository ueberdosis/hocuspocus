import { Server } from '../packages/server/src/index'
import { LevelDB } from '../packages/leveldb/src/index'

const server = Server.configure({

  port: 1234,

  persistence: new LevelDB({
    path: './database',
  }),

  onConnect(data, resolve, reject) {
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

  onChange(data) {

    // do something with the data
    // console.log(`${data.documentName} was sent to an API!`)
  },

  onDisconnect(data) {
    // handle disconnect
    // console.log(`User ${data.context.user_id} disconnected from ${data.documentName}`)
  },
})

server.listen()
