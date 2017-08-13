#!/usr/bin/env node
/* global process, global */
'use strict'

var Y = require('yjs')
const log = Y.debug('y-websockets-server')
const fs = require('fs')

var config = {}
try {
  config = JSON.parse(fs.readFileSync('config.json', 'utf8'))
  log('Using provided config.json', config)
} catch (e) {}

Y.debug.log = console.log.bind(console)

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
  string: ['port', 'debug', 'db', 'persistence'],
  default: {
    port: process.env.PORT || config.port || '1234',
    debug: false,
    db: config.db || 'memory',
    redis: process.env.REDIS || config.redis || null
  }
})

var port = Number.parseInt(options.port, 10)
var io = require('socket.io')(port)
let redis = null
if (options.redis != null) {
  require('y-redis')(Y)
  redis = require('redis').createClient(options.redis, {
    return_buffers: true
  })
}
console.log('Running y-websockets-server: port: %s, redis: %s ', port, options.redis)

global.yInstances = {}

function getInstanceOfY (room) {
  if (global.yInstances[room] == null) {
    let yConfig = {
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
    }
    if (redis != null) {
      yConfig.persistence = {
        name: 'redis',
        redis: redis
      }
    }
    global.yInstances[room] = Y(yConfig)
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
  socket.on('yjsEvent', function (buffer) {
    let decoder = new Y.utils.BinaryDecoder(buffer)
    let roomname = decoder.readVarString()
    getInstanceOfY(roomname).then(function (y) {
      y.connector.receiveMessage(socket.id, buffer)
    })
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
