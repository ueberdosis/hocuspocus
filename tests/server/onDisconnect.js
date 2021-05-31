import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

let client
const ydoc = new Y.Doc()
const Server = new Hocuspocus()

context('server/onDisconnect', () => {
  afterEach(() => {
    Server.destroy()
    client.destroy()
  })

  it('onDisconnect callback is executed', done => {
    Server.configure({
      port: 4000,
      async onDisconnect() {
        done()
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-demo',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })

    client.on('connect', () => {
      client.disconnect()
    })
  })
})
