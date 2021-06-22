import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

let client
const ydoc = new Y.Doc()
const Server = new Hocuspocus()

context('server/onConfigure', () => {
  afterEach(() => {
    Server.destroy()
    client.destroy()
  })

  it('onConfigure callback is executed', done => {
    Server.configure({
      port: 4000,
      async onConfigure() {
        setTimeout(() => {
          done()
        }, 0)
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })
  })
})
