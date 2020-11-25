import { TiptapCollaborationServer } from 'TiptapCollaborationServer'

const server = TiptapCollaborationServer.create({
  port: 1234,
  debounce: true, // or 2000

  onConnect({namespace, documentName, clientID, requestHeaders}, resolve, reject) {
    resolve()
  },

  onJoinDocument({namespace, documentName, clientID, requestHeaders, clientsCount, document}, resolve, reject) {
    resolve()
  },

  onChange({namespace, documentName, clientID, requestHeaders, clientsCount, document}, resolve, reject) {

  },

  onLeaveDocument({namespace, documentName, clientID, requestHeaders, clientsCount, document}) {

  },

  onDisconnect({namespace, documentName, clientID, requestHeaders}) {

  },
})

// server.configure({
//   port: 1234,
// })

// server.onConnect((data, resolve) => {
//   resolve()
// })

server.listen()
