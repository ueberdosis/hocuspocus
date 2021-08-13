import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

let client
const ydoc = new Y.Doc()

context('server/onConnect', () => {
  it('executes the onConnect callback', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
      async onConnect({ documentName }) {
        setTimeout(() => {
          assert.strictEqual(documentName, 'hocuspocus-test')

          client.destroy()
          Server.destroy()

          done()
        }, 0)
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })
  })

  it('stops when the onConnect hook throws an Error', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
      async onConnect() {
        throw new Error()
      },
      // MUST NOT BE CALLED
      async onCreateDocument() {
        console.log('WARNING: When onConnect fails onCreateDocument must not be called.')
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onClose: () => {
        client.destroy()
        Server.destroy()

        done()
      },
    })
  })
})
