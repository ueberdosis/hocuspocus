import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

let client
let client2
const ydoc = new Y.Doc()
const ydoc2 = new Y.Doc()

context('server/closeConnections', () => {
  it('should only close a specific connection when a docName is passed', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
    }).listen()

    const clientDonePromise = new Promise(res => {
      client = new HocuspocusProvider({
        url: 'ws://127.0.0.1:4000',
        name: 'hocuspocus-test',
        document: ydoc,
        WebSocketPolyfill: WebSocket,
        onSynced() {
          Server.closeConnections('hocuspocus-test')
        },
        onClose() {
          // Dont reconnect after we force close
          client.disconnect()
          res()
        },
      })
    })

    const client2DonePromise = new Promise(res => {
      client2 = new HocuspocusProvider({
        url: 'ws://127.0.0.1:4000',
        name: 'hocuspocus-test-2',
        document: ydoc2,
        WebSocketPolyfill: WebSocket,
        onSynced() {
          res()
        },
      })
    })

    // Wait for the disconnected client to close and the second
    // connection to sync before proceeding to assert
    Promise.all([clientDonePromise, client2DonePromise]).then(() => {
      assert.strictEqual(client.status, 'disconnected')
      assert.strictEqual(client2.status, 'connected')

      client.destroy()
      client2.destroy()
      Server.destroy()
      done()
    })
  })

  it('should closes all connections when no argument is passed', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
    }).listen()

    const clientDonePromise = new Promise(res => {
      client = new HocuspocusProvider({
        url: 'ws://127.0.0.1:4000',
        name: 'hocuspocus-test',
        document: ydoc,
        WebSocketPolyfill: WebSocket,
        onClose() {
          // Dont reconnect after we force close
          client.disconnect()
          res()
        },
      })
    })

    const client2DonePromise = new Promise(res => {
      client2 = new HocuspocusProvider({
        url: 'ws://127.0.0.1:4000',
        name: 'hocuspocus-test-2',
        document: ydoc2,
        WebSocketPolyfill: WebSocket,
        onSynced() {
          Server.closeConnections()
        },
        onClose() {
          // Dont reconnect after we force close
          client2.disconnect()
          res()
        },
      })
    })

    // Wait for both clients to disconnect before asserting
    Promise.all([clientDonePromise, client2DonePromise]).then(() => {
      assert.strictEqual(client.status, 'disconnected')
      assert.strictEqual(client2.status, 'disconnected')

      client.destroy()
      client2.destroy()
      Server.destroy()
      done()
    })
  })
})
