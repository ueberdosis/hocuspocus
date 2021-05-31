import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusClient } from '../../packages/client/src'

let client
const ydoc = new Y.Doc()
const Server = new Hocuspocus()

context('client/onClose', () => {
  before(() => {
    Server.configure({ port: 4000 }).listen()
  })

  after(() => {
    Server.destroy()
  })

  it('onClose callback is executed', done => {
    client = new HocuspocusClient({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-demo',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onConnect: () => {
        client.disconnect()
      },
      onClose: () => {
        done()
      },
    })
  })

  it("on('close') callback is executed", done => {
    client = new HocuspocusClient({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-demo',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })

    client.on('connect', () => {
      client.disconnect()
    })
    client.on('close', () => {
      done()
    })
  })
})
