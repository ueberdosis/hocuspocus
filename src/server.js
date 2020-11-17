const Y = require('yjs')
require('./y-websockets-server.js')(Y)

const WebSocket = require('ws')
const http = require('http')
const setupWSConnection = require('y-websocket/bin/utils.js').setupWSConnection
const port = process.env.PORT || 1234
const server = http.createServer()
const wss = new WebSocket.Server({ server })

wss.on('connection', (connection, request) => {
  return setupWSConnection(connection, request)
})

server.listen(port, () => {
  console.log(`[Websocket Server] Listening to http://localhost:${port}`)
})

global.yInstances = {}

function getInstanceOfY (room) {
  if (global.yInstances[room] == null) {
    let yConfig = {
      connector: {
        name: 'websockets-server',
        room: room,
        io: io,
        debug: !!options.debug
      }
    }
    global.yInstances[room] = new Promise(function (resolve) {
      const y = new Y(room, yConfig, persistence)
      y.when('connectorReady').then(function () {
        resolve(y)
      })
    })
  }
  return global.yInstances[room]
}


wss.on('connection', function (socket) {
  console.log('[Websocket Server] New connection')

  socket.on('message', function incoming(message) {
    console.log('[Websocket Server] Message received: %s', message)
  })

  var rooms = []
  socket.on('joinRoom', function (room) {
    console.log(`[Websocket Server] User ${socket.id} joins room ${room}`)

    socket.join(room)
    getInstanceOfY(room).then(function (y) {
      global.y = y // TODO: remove !!!

      if (rooms.indexOf(room) === -1) {
        y.connector.userJoined(socket.id, 'slave')
        rooms.push(room)
      }
    })
  })

  socket.on('yjsResponsive', function (room, callback) {
    console.log(`[Websocket Server] User ${socket.id} checks responsiveness of room ${room}`)

    getInstanceOfY(room).then(function (y) {
      y.db.whenTransactionsFinished().then(callback)
    })
  })

  socket.on('yjsEvent', function (buffer) {
    console.log(`[Websocket Server] yjsEvent`)

    let decoder = new Y.utils.BinaryDecoder(buffer)
    let roomname = decoder.readVarString()
    getInstanceOfY(roomname).then(function (y) {
      y.connector.receiveMessage(socket.id, buffer)
    })
  })

  socket.on('disconnect', function () {
    console.log(`[Websocket Server] Disconnect`)

    for (var i = 0; i < rooms.length; i++) {
      let room = rooms[i]
      getInstanceOfY(room).then(function (y) {
        var i = rooms.indexOf(room)
        if (i >= 0) {
          y.connector.userLeft(socket.id)
          rooms.splice(i, 1)
        }
      })
    }
  })

  socket.on('leaveRoom', function (room) {
    console.log(`[Websocket Server] LeaveRoom`)

    getInstanceOfY(room).then(function (y) {
      var i = rooms.indexOf(room)
      if (i >= 0) {
        y.connector.userLeft(socket.id)
        rooms.splice(i, 1)
      }
    })
  })
})
