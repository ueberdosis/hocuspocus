import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '@hocuspocus/server'
import { HocuspocusProvider } from '@hocuspocus/provider'

const ydoc = new Y.Doc()
const server = new Hocuspocus()

context('provider/onClose', () => {
  before(() => {
    server.configure({ port: 4000 }).listen()
  })

  after(() => {
    server.destroy()
  })

  it('onClose callback is executed', done => {
    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onConnect: () => {
        client.disconnect()
      },
      onClose: () => {
        client.destroy()
        done()
      },
    })
  })

  it("on('close') callback is executed", done => {
    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })

    client.on('connect', () => {
      client.disconnect()
    })
    client.on('close', () => {
      client.destroy()
      done()
    })
  })
})
