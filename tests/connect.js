/* eslint-disable */
import { expect } from 'chai'
import { Hocuspocus } from '../packages/server/src'
import * as Y from 'yjs'
import pkg from 'y-websocket'
import { EventEmitter } from 'events'
import ws from 'ws'

const { WebsocketProvider } = pkg

const defaultPort = parseInt(process.env.DEFAULT_PORT || 1234)

context('connect', () => {
  let Server

  beforeEach(() => {
    Server = new Hocuspocus
  })

  afterEach(() => {
    Server.destroy()
  })

  it.skip('should be able to connect to the websocket server', async () => {
    Server.configure({
      port: defaultPort,
      onListen(data, resolve, reject) {
        // const doc = new Y.Doc()
        // const wsProvider = new WebsocketProvider(
        //   `ws://localhost:${defaultPort}`,
        //   'test',
        //   doc,
        //   { WebSocketPolyfill: ws }
        //   )
        //
        // wsProvider.on('status', event => {
        //   if(event.status === 'connected') {
        //     resolve()
        //   }
        // })
      }
    })

    await Server.listen()
  })

})
