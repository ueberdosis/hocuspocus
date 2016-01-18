#!/usr/bin/env node
/* global process, global */

var Y = require('yjs')
var minimist = require('minimist')
require('y-memory')(Y)
require('./Websockets-server.js')(Y)

var options = minimist(process.argv.slice(2), {
  string: ['port', 'debug'],
  default: {
    port: '1234',
    debug: false
  }
})
var port = Number.parseInt(options.port, 10)
var io = require('socket.io')(port)
console.log('Running y-websockets-server on port ' + port)

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
        io: io,
        debug: !!options.debug
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
    })
  })
  socket.on('yjsEvent', function (msg) {
    if (msg.room != null) {
      getInstanceOfY(msg.room).then(function (y) {
        y.connector.receiveMessage(socket.id, msg)
      })
    }
  })
  socket.on('disconnect', function (msg) {
    if (msg.room != null) {
      getInstanceOfY(msg.room).then(function (y) {
        y.connector.userLeft(socket.id)
      })
    }
  })
})
