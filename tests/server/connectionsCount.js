// import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { assert } from 'chai'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

const ydoc = new Y.Doc()

context('server/connectionsCount', () => {
  it('outputs the total connections', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
    })

    Server.listen()

    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onSynced() {
        assert.strictEqual(Server.connectionsCount(), 1)

        const client2 = new HocuspocusProvider({
          url: 'ws://127.0.0.1:4000',
          name: 'hocuspocus-test2',
          document: ydoc,
          WebSocketPolyfill: WebSocket,
          onSynced() {
            assert.strictEqual(Server.connectionsCount(), 2)

            client2.destroy()
            client.destroy()
            Server.destroy()
            done()
          },
        })
      },
    })
  })
})
