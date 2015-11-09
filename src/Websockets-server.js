/* global Y */
'use strict'

function extend (Y) {
  class Connector extends Y.AbstractConnector {
    constructor (y, options) {
      if (options === undefined) {
        throw new Error('Options must not be undefined!')
      }
      if (options.room == null) {
        throw new Error('You must define a room name!')
      }
      if (options.io == null) {
        throw new Error('You must define the socketio serve!')
      }
      options.role = 'slave'
      super(y, options)
      this.options = options
      this.io = options.io
      this.setUserId('server')
    }
    disconnect () {
      throw new Error('You must not disconnect with this connector!')
    }
    reconnect () {
      throw new Error('You must not disconnect with this connector!')
    }
    send (uid, message) {
      this.io.to(uid).emit('yjsEvent', message)
    }
    broadcast (message) {
      this.io.in(this.options.room).emit('yjsEvent', message)
    }
    isDisconnected () {
      return false
    }
  }
  Y.extend('websockets-server', Connector)
}

module.exports = extend
if (typeof Y !== 'undefined') {
  extend(Y)
}
