import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

let client
const ydoc = new Y.Doc()

context('client/onAwarenessChange', () => {
  afterEach(() => {
    client.destroy()
  })

  it('onAwarenessChange callback is executed', done => {
    const Server = new Hocuspocus()

    Server.configure({ port: 4000 }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-demo',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onConnect: () => {
        client.setAwarenessField('foo', 'bar')
      },
      onAwarenessChange: ({ states }) => {
        Server.destroy()

        assert.strictEqual(states[0].foo, 'bar')

        done()
      },
    })
  })
})
