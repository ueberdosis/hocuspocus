import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '@hocuspocus/server'
import { HocuspocusProvider } from '@hocuspocus/provider'

let anotherClient
const ydoc = new Y.Doc()

context('server/onAwarenessUpdate', () => {
  it('onAwarenessUpdate hook is executed', done => {
    let client
    const server = new Hocuspocus()

    let called = false

    server.configure({
      port: 4000,
      onAwarenessUpdate: ({ states }) => {
        if (called) {
          return
        }

        called = true

        server.destroy()
        client.destroy()

        assert.strictEqual(states.length, 1)
        assert.strictEqual(states[0].foo, 'bar')

        done()
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onConnect: () => {
        client.setAwarenessField('foo', 'bar')
      },
    })
  })
})
