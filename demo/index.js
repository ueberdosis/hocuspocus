import { CollaborationServer } from '@tiptap/collaboration-server'
import { PersistenceLevelDB } from '@tiptap/persistence-leveldb'
import { PersistenceRedis } from '@tiptap/persistence-redis'

const server = CollaborationServer.create({

  port: 1234,
  debounce: 2000, // or true/false
  debounceMaximum: 10000,

  persistence: new PersistenceLevelDB({
    path: './database',
  }),
  // persistence: new PersistenceRedis({
  //   port: 6379,
  //   host: '127.0.0.1',
  //   family: 4, // 4 (IPv4) or 6 (IPv6)
  //   password: null,
  //   db: 0,
  // }),
  // persistence: new PersistenceRedis('/tmp/redis.sock'),
  // persistence: new PersistenceRedis('redis://:authpassword@127.0.0.1:6380/4'),

  onConnect(data, resolve, reject) {
    const {documentName, clientID, requestHeaders} = data

    resolve()
  },

  onJoinDocument(data, resolve, reject) {
    const {documentName, clientID, requestHeaders, clientsCount, document} = data

    resolve()
  },

  onChange(data) {
    const {documentName, clientID, requestHeaders, clientsCount, document} = data

  },

  onLeaveDocument(data) {
    const {documentName, clientID, requestHeaders, clientsCount, document} = data

  },

  onDisconnect(data) {
    const {documentName, clientID, requestHeaders} = data

  },

})

// server.configure({
//   port: 1234,
// })

// server.configure({
//   onConnect(data, resolve) {
//     resolve()
//   },
// })

server.listen()
