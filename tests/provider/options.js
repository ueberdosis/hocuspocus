import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '@hocuspocus/server'
import { HocuspocusProvider } from '@hocuspocus/provider'

let client
const ydoc = new Y.Doc()
const server = new Hocuspocus()

context('provider/options', () => {
  it('has default options (maxDelay = 30000)', () => {
    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })

    assert.strictEqual(client.options.maxDelay, 30000)
  })

  it('overwrites the default options', () => {
    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      maxDelay: 10000,
      WebSocketPolyfill: WebSocket,
    })

    assert.strictEqual(client.options.maxDelay, 10000)
  })
})
