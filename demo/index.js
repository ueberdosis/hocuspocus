import { Server } from '@hocuspocus/server'
// import { LevelDB } from '@hocuspocus/leveldb'
// import { Redis } from '@hocuspocus/redis'

const server = Server.configure({

  port: 1234,
  debounce: 2000, // or true/false
  debounceMaxWait: 10000,

  // persistence: new LevelDB({
  //   path: './database',
  // }),
  // persistence: new Redis({
  //   port: 6379,
  //   host: '127.0.0.1',
  //   family: 4, // 4 (IPv4) or 6 (IPv6)
  //   password: null,
  //   db: 0,
  // }),
  // persistence: new Redis('/tmp/redis.sock'),
  // persistence: new Redis('redis://:authpassword@127.0.0.1:6380/4'),

  onConnect(data, resolve, reject) {
    const { requestHeaders } = data

    // authenticate using request headers
    // if (requestHeaders.access_token !== 'super-secret-token') {
    //   return reject()
    // }

    // set context for later usage
    const context = { user_id: 1234 }
    resolve(context)
  },

  onJoinDocument(data, resolve, reject) {
    const {
      clientsCount,
      document,
      documentName,
      requestHeaders,
      context,
    } = data

    // authorize user
    // if (context.user_id !== 1234) {
    //   return reject()
    // }

    resolve()
  },

  onChange(data) {
    const {
      documentName,
      requestHeaders,
      clientsCount,
      document,
    } = data

    // handle the data
  },

  // onLeaveDocument(data) {
  //   const {
  //     documentName, clientID, requestHeaders, clientsCount, document,
  //   } = data
  //
  // },
  //
  // onDisconnect(data) {
  //   const { documentName, clientID, requestHeaders } = data
  //
  // },

})

server.listen()
