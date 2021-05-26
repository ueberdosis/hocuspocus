import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Server } from '../../packages/server/src'
import { HocuspocusClient } from '../../packages/client/src'

let client
const ydoc = new Y.Doc()

context('onOpen', () => {
  before(() => {
    Server.configure({ port: 4000 }).listen()
  })

  after(() => {
    Server.destroy()
  })

  afterEach(() => {
    client.destroy()
  })

  it('onOpen callback is executed', done => {
    client = new HocuspocusClient({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-demo',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })

    client.on('open', () => {
      done()
    })
  })

  it("on('open') callback is executed", done => {
    client = new HocuspocusClient({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-demo',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onOpen: () => {
        done()
      },
    })
  })
})
