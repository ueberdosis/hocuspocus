import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusClient } from '../../packages/client/src'

let client
const ydoc = new Y.Doc()
const Server = new Hocuspocus()

context('server/onConnect', () => {
  afterEach(() => {
    Server.destroy()
    client.destroy()
  })

  it('onConnect callback is executed', done => {
    Server.configure({
      port: 4000,
      async onConnect({ documentName }) {
        setTimeout(() => {
          assert.strictEqual(documentName, 'hocuspocus-demo')
          done()
        }, 0)
      },
    }).listen()

    client = new HocuspocusClient({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-demo',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })
  })
})
