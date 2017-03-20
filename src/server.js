#!/usr/bin/env node
/* global process, global */
'use strict'

var Y = require('yjs')

Y.debug.log = console.log.bind(console)

const log = Y.debug('y-websockets-server')
var minimist = require('minimist')
require('y-memory')(Y)
try {
  require('y-leveldb')(Y)
} catch (err) {}

try {
  // try to require local y-websockets-server
  require('./y-websockets-server.js')(Y)
} catch (err) {
  // otherwise require global y-websockets-server
  require('y-websockets-server')(Y)
}

var options = minimist(process.argv.slice(2), {
  string: ['port', 'debug', 'db'],
  default: {
    port: process.env.PORT || '1234',
    debug: false,
    db: 'memory'
  }
})

var port = Number.parseInt(options.port, 10)
var io = require('socket.io')(port)
console.log('Running y-websockets-server on port ' + port)

global.yInstances = {}

function getInstanceOfY (room) {
  if (global.yInstances[room] == null) {
    global.yInstances[room] = Y({
      db: {
        name: options.db,
        dir: 'y-leveldb-databases',
        namespace: room
      },
      connector: {
        name: 'websockets-server',
        room: room,
        io: io,
        debug: !!options.debug
      },
      share: {}
    })
  }
  return global.yInstances[room]
}

io.on('connection', function (socket) {
  var rooms = []
  socket.on('joinRoom', function (room) {
    log('User "%s" joins room "%s"', socket.id, room)
    socket.join(room)
    getInstanceOfY(room).then(function (y) {
      global.y = y // TODO: remove !!!
      if (rooms.indexOf(room) === -1) {
        y.connector.userJoined(socket.id, 'slave')
        rooms.push(room)
      }
    })
  })
  socket.on('yjsEvent', function (msg) {
    if (msg.room != null) {
      getInstanceOfY(msg.room).then(function (y) {
        y.connector.receiveMessage(socket.id, msg)
      })
    }
  })
  socket.on('disconnect', function () {
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
    getInstanceOfY(room).then(function (y) {
      var i = rooms.indexOf(room)
      if (i >= 0) {
        y.connector.userLeft(socket.id)
        rooms.splice(i, 1)
      }
    })
  })
})
