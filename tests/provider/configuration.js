import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { HocuspocusProvider } from '@hocuspocus/provider'

let client
const ydoc = new Y.Doc()

context('provider/configuration', () => {
  it('has default configuration (maxDelay = 30000)', () => {
    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })

    assert.strictEqual(client.configuration.maxDelay, 30000)
  })

  it('overwrites the default configuration', () => {
    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      maxDelay: 10000,
      WebSocketPolyfill: WebSocket,
    })

    assert.strictEqual(client.configuration.maxDelay, 10000)
  })
})
