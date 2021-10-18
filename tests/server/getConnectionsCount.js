// import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { assert } from 'chai'
import { Hocuspocus } from '@hocuspocus/server'
import { HocuspocusProvider } from '@hocuspocus/provider'

const ydoc = new Y.Doc()

context('server/getConnectionsCount', () => {
  it('outputs the total connections', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
    })

    server.listen()

    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onSynced() {
        assert.strictEqual(server.getConnectionsCount(), 1)

        const client2 = new HocuspocusProvider({
          url: 'ws://127.0.0.1:4000',
          name: 'hocuspocus-test2',
          document: ydoc,
          WebSocketPolyfill: WebSocket,
          onSynced() {
            assert.strictEqual(server.getConnectionsCount(), 2)

            client2.destroy()
            client.destroy()
            server.destroy()
            done()
          },
        })
      },
    })
  })
})
