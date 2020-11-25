import { TiptapCollaborationServer } from './src/Server.js'

const server = TiptapCollaborationServer.create({

  port: 1234,
  debounce: 2000, // or true/false
  debounceMaximum: 10000,
  databaseDirectory: null, // or ./database
  redis: {
    port: 6379,
    host: '127.0.0.1',
    family: 4, // 4 (IPv4) or 6 (IPv6)
    password: null,
    db: 0,
  },
  // redis: '/tmp/redis.sock',
  // redis: 'redis://:authpassword@127.0.0.1:6380/4',

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

// server.onConnect((data, resolve) => {
//   resolve()
// })

server.listen()
