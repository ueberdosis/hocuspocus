import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

let client
const ydoc = new Y.Doc()
const Server = new Hocuspocus()

context('server/onChange', () => {
  afterEach(() => {
    Server.destroy()
    client.destroy()
  })

  it('onChange callback receives updates', done => {
    let triggered = false

    Server.configure({
      port: 4000,
      async onChange({ document }) {
        const value = document.getArray('foo').get(0)

        if (!triggered && value === 'bar') {
          triggered = true
          assert.strictEqual(value, 'bar')
          done()
        }
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })

    client.on('synced', () => {
      ydoc.getArray('foo').insert(0, ['bar'])
    })
  })
})
