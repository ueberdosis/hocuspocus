import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

let client
const ydoc = new Y.Doc()

context('server/onDestroy', () => {
  it('has the server instance', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async onDestroy({ instance }) {
        assert.strictEqual(instance, server)
        client.destroy()
        done()
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onConnect: () => {
        server.destroy()
      },
    })
  })
})
