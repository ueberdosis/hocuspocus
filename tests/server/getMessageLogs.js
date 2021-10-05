// import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { assert } from 'chai'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

const ydoc = new Y.Doc()

context('server/getMessageLogs', () => {
  it('outputs the message log', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async onAuthenticate() {
        return true
      },
    })

    server.enableDebugging()

    server.listen()

    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      token: 'secret',
      onSynced() {
        assert.isTrue(server.getMessageLogs().length > 0)

        client.destroy()
        server.destroy()
        done()
      },
    })
  })
})
