import { TiptapCollaborationServer } from './TiptapCollaborationServer.js'

const server = TiptapCollaborationServer.create({

  port: 1234,
  debounce: true, // or 2000

  onConnect(data, resolve, reject) {
    const {namespace, documentName, clientID, requestHeaders} = data

    resolve()
  },

  onJoinDocument(data, resolve, reject) {
    const {namespace, documentName, clientID, requestHeaders, clientsCount, document} = data

    resolve()
  },

  onChange(data) {
    const {namespace, documentName, clientID, requestHeaders, clientsCount, document} = data

  },

  onLeaveDocument(data) {
    const {namespace, documentName, clientID, requestHeaders, clientsCount, document} = data

  },

  onDisconnect(data) {
    const {namespace, documentName, clientID, requestHeaders} = data

  },

})

// server.configure({
//   port: 1234,
// })

// server.onConnect((data, resolve) => {
//   resolve()
// })

server.listen()
