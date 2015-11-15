var io = require('socket.io')(1234)
var Y = require('../../yjs/src/y.js')
require('./Websockets-server.js')(Y)
require('../../y-memory/src/Memory.js')(Y)
require('../../y-array/src/Array.js')(Y)

global.yInstances = {}

function getInstanceOfY (room) {
  if (global.yInstances[room] == null) {
    return Y({
      db: {
        name: 'memory'
      },
      connector: {
        name: 'websockets-server',
        room: room,
        io: io
      }
    }).then(function (y) {
      global.yInstances[room] = y
      return y
    })
  } else {
    return Promise.resolve(global.yInstances[room])
  }
}

io.on('connection', function (socket) {
  socket.on('joinRoom', function (room) {
    console.log('User', socket.id, 'joins room:', room)
    socket.join(room)
    getInstanceOfY(room).then(function (y) {
      y.connector.userJoined(socket.id, 'slave')
      socket.on('yjsEvent', function (msg) {
        y.connector.receiveMessage(socket.id, msg)
      })
      socket.on('disconnect', function (msg) {
        y.connector.userLeft(socket.id)
      })
    })
  })
})
