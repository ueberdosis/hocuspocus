import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

const ydoc = new Y.Doc()
const server = new Hocuspocus()

context('provider/onDisconnect', () => {
  before(() => {
    server.configure({ port: 4000 }).listen()
  })

  after(() => {
    server.destroy()
  })

  it('onDisconnect callback is executed', done => {
    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
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
    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
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
