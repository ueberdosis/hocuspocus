import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '@hocuspocus/server'
import { HocuspocusProvider } from '@hocuspocus/provider'

let client
let anotherClient
const ydoc = new Y.Doc()
const ydoc2 = new Y.Doc()

context('server/closeConnections', () => {
  it('closes a specific connection when a documentName is passed', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
    }).listen()

    const clientDonePromise = new Promise(resolve => {
      client = new HocuspocusProvider({
        url: 'ws://127.0.0.1:4000',
        name: 'hocuspocus-test',
        document: ydoc,
        WebSocketPolyfill: WebSocket,
        onSynced() {
          server.closeConnections('hocuspocus-test')
        },
        onClose() {
          // Make the sure client doesn’t reconnect
          client.disconnect()
          resolve()
        },
      })
    })

    const anotherClientDonePromise = new Promise(resolve => {
      anotherClient = new HocuspocusProvider({
        url: 'ws://127.0.0.1:4000',
        name: 'hocuspocus-test-2',
        document: ydoc2,
        WebSocketPolyfill: WebSocket,
        onSynced() {
          resolve()
        },
      })
    })

    // Wait for the disconnected client to close and the second
    // connection to sync before proceeding to assert
    Promise.all([clientDonePromise, anotherClientDonePromise]).then(() => {
      assert.strictEqual(client.status, 'disconnected')
      assert.strictEqual(anotherClient.status, 'connected')

      client.destroy()
      anotherClient.destroy()
      server.destroy()
      done()
    })
  })

  it('closes all connections when no documentName is passed', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
    }).listen()

    const clientDonePromise = new Promise(resolve => {
      client = new HocuspocusProvider({
        url: 'ws://127.0.0.1:4000',
        name: 'hocuspocus-test',
        document: ydoc,
        WebSocketPolyfill: WebSocket,
        onClose() {
          // Make the sure client doesn’t reconnect
          client.disconnect()
          resolve()
        },
      })
    })

    const anotherClientDonePromise = new Promise(resolve => {
      anotherClient = new HocuspocusProvider({
        url: 'ws://127.0.0.1:4000',
        name: 'hocuspocus-test-2',
        document: ydoc2,
        WebSocketPolyfill: WebSocket,
        onSynced() {
          server.closeConnections()
        },
        onClose() {
          // Make the sure client doesn’t reconnect
          anotherClient.disconnect()
          resolve()
        },
      })
    })

    // Wait for both clients to disconnect before asserting
    Promise.all([clientDonePromise, anotherClientDonePromise]).then(() => {
      assert.strictEqual(client.status, 'disconnected')
      assert.strictEqual(anotherClient.status, 'disconnected')

      client.destroy()
      anotherClient.destroy()
      server.destroy()
      done()
    })
  })

  it('uses a proper close event', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
    }).listen()

    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onSynced() {
        server.closeConnections()
      },
      onClose({ event }) {
        assert.strictEqual(event.code, 4205)
        assert.strictEqual(event.reason, 'Reset Connection')

        client.destroy()
        server.destroy()
        done()
      },
    })
  })
})
