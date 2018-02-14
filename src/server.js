#!/usr/bin/env node
/* global process, global */
'use strict'

const Y = require('../../yjs/y.node.js')
const debug = require('debug')
const log = debug('y-websockets-server')
const fs = require('fs')

var config = {}
try {
  config = JSON.parse(fs.readFileSync('config.json', 'utf8'))
  log('Using provided config.json', config)
} catch (e) {}

debug.log = console.log.bind(console)

var minimist = require('minimist')

try {
  // try to require local y-websockets-server
  require('./y-websockets-server.js')(Y)
} catch (err) {
  console.error(err)
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

// if Y_RANDOM_PROCESS_KILL is set, the node app is randomly killed (within 8 seconds)
if (process.env.Y_RANDOM_PROCESS_KILL != null) {
  console.error('You set Y_RANDOM_PROCESS_KILL environment variable. The process is killed within 8 seconds!')
  setInterval(() => {
    process.exit(0)
  }, Math.floor(Math.random() * 20000))
}

var port = Number.parseInt(options.port, 10)
var io = require('socket.io')(port)

let persistence = null
if (options.redis != null) {
  const YRedisPersistence = require('y-redis')(Y)
  const checkContentChange = function checkContentChange (y, transaction) {
    return transaction.changedParentTypes.has(y.define('xml', Y.XmlFragment))
  }
  persistence = new YRedisPersistence(options.redis, checkContentChange)
}
console.log('Running y-websockets-server: port: %s, redis: %s ', port, options.redis)

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
  socket.on('yjsResponsive', function (room, callback) {
    log('User "%s" checks responsiveness of room "%s"', socket.id, room)
    getInstanceOfY(room).then(function (y) {
      y.db.whenTransactionsFinished().then(callback)
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
