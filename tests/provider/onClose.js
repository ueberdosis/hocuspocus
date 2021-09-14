import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

const ydoc = new Y.Doc()
const Server = new Hocuspocus()

context('provider/onClose', () => {
  before(() => {
    Server.configure({ port: 4000 }).listen()
  })

  after(() => {
    Server.destroy()
  })

  it('onClose callback is executed', done => {
    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      maxAttempts: 1,
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
      maxAttempts: 1,
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
