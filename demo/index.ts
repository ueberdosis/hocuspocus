/* eslint-disable */
import { Server } from '@hocuspocus/server/src/index'
import { LevelDB } from '@hocuspocus/leveldb/src/index'
// import { Redis } from '@hocuspocus/redis'

const server = Server.configure({

  port: 1234,
  debounce: 2000, // or true/false
  debounceMaxWait: 10000,

  persistence: new LevelDB({
    path: './database',
  }),
  // persistence: new Redis({
  //   port: 6379,
  //   host: '127.0.0.1',
  // }),
  // persistence: new Redis({
  //   port: 6379,
  //   host: '127.0.0.1',
  // }, {
  //    // Redis Cluster Options
  // ),

  onConnect(data: any, resolve: any, reject: any) {
    const { requestHeaders, requestParameters } = data

    // authenticate using request headers
    // if (requestHeaders.access_token !== 'super-secret-token') {
    //   return reject()
    // }

    // set context for later usage
    const context = { user_id: 1234 }
    resolve(context)
  },

  onJoinDocument(data: any, resolve: any, reject: any) {
    const {
      clientsCount,
      context,
      document,
      documentName,
      requestHeaders,
      requestParameters,
    } = data

    // authorize user
    // if (context.user_id !== 1234) {
    //   return reject()
    // }

    resolve()
  },

  onChange(data: any) {
    const {
      clientsCount,
      document,
      documentName,
      requestHeaders,
      requestParameters,
    } = data

    // handle
  },

  onDisconnect(data: any) {
    const {
      clientsCount,
      document,
      documentName,
      requestHeaders,
      requestParameters,
    } = data

    // handle
  },
})

server.listen()
