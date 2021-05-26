import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Server } from '../../packages/server/src'
import { HocuspocusClient } from '../../packages/client/src'

let client
const ydoc = new Y.Doc()

context('client/onDisconnect', () => {
  before(() => {
    Server.configure({ port: 4000 }).listen()
  })

  after(() => {
    Server.destroy()
  })

  it('onDisconnect callback is executed', done => {
    client = new HocuspocusClient({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-demo',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onConnect: () => {
        client.disconnect()
      },
      onDisconnect: () => {
        done()
        client.destroy()
      },
    })
  })

  it("on('disconnect') callback is executed", done => {
    client = new HocuspocusClient({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-demo',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })

    client.on('connect', () => {
      client.disconnect()
    })
    client.on('disconnect', () => {
      done()
      client.destroy()
    })
  })
})
