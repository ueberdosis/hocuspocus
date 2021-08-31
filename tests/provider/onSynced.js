import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

let client

context('provider/onSynced', () => {
  afterEach(() => {
    client.destroy()
  })

  it('onSynced callback is executed', done => {
    const ydoc = new Y.Doc()

    const Server = new Hocuspocus()
    Server.configure({ port: 4000 }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onSynced: () => {
        Server.destroy()

        done()
      },
    })
  })

  it("on('synced') callback is executed", done => {
    const ydoc = new Y.Doc()

    const Server = new Hocuspocus()
    Server.configure({ port: 4000 }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })

    client.on('synced', () => {
      Server.destroy()

      done()
    })
  })

  it('onSynced callback is executed, even when the onConnect takes longer', done => {
    const ydoc = new Y.Doc()

    const Server = new Hocuspocus()
    Server.configure({
      port: 4000,

      async onConnect(data) {
        await new Promise((resolve, reject) => setTimeout(() => {
          resolve()
        }, 100))
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onSynced: () => {
        Server.destroy()

        done()
      },
    })
  })

  it('onSynced callback is executed when the document is actually synced', done => {
    const ydoc = new Y.Doc()

    const Server = new Hocuspocus()
    Server.configure({
      port: 4000,

      async onCreateDocument({ document }) {
        document.getArray('foo').insert(0, ['bar'])

        return document
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onSynced: () => {
        Server.destroy()

        const value = ydoc.getArray('foo').get(0)
        assert.strictEqual(value, 'bar')

        done()
      },
    })
  })

  it.only('send all messages according to the protocol', done => {
    const ydoc = new Y.Doc()

    const Server = new Hocuspocus()
    Server.configure({
      port: 4000,

      async onCreateDocument({ document }) {
        document.getArray('foo').insert(0, ['bar'])

        return document
      },
    })
    Server.enableDebugging()
    Server.enableLogging()
    Server.listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onSynced: () => {
        // In a client-server model, you want to handle this differently: The client should initiate the connection with SyncStep1.
        // When the server receives SyncStep1, it should reply with SyncStep2 immediately followed by SyncStep1. The client replies
        // with SyncStep2 when it receives SyncStep1. Optionally the server may send a SyncDone after it received SyncStep2, so the
        // client knows that the sync is finished.  There are two reasons for this more elaborated sync model: 1. This protocol can
        // easily be implemented on top of http and websockets. 2. The server shoul only reply to requests, and not initiate them.
        // Therefore it is necesarry that the client initiates the sync.

        // Source: https://github.com/yjs/y-protocols/blob/master/sync.js#L23-L28

        // Expected (according to the protocol)
        // [
        //   { direction: 'in', type: 'Sync', category: 'SyncStep1' },
        //   { direction: 'out', type: 'Sync', category: 'SyncStep2' },
        //   { direction: 'out', type: 'Sync', category: 'SyncStep1' },
        //   { direction: 'in', type: 'Sync', category: 'SyncStep2' },
        //   { direction: 'in', type: 'Awareness', category: 'Update' },
        // ]

        assert.deepStrictEqual(Server.getMessageLogs(), [
          { direction: 'out', type: 'Sync', category: 'SyncStep1' },
          { direction: 'in', type: 'Sync', category: 'SyncStep1' },
          { direction: 'in', type: 'Awareness', category: 'Update' },
          // TODO: That should output `type: 'Sync'`, right?
          { direction: 'in', type: 'Auth', category: 'Update' },
        ])

        Server.destroy()

        done()
      },
    })
  })

  it('onSynced callback is executed when the document is actually synced, even if it takes longer', done => {
    const ydoc = new Y.Doc()

    const Server = new Hocuspocus()
    Server.configure({
      port: 4000,

      async onCreateDocument({ document }) {
        // sleep for 100ms
        await new Promise(resolve => setTimeout(resolve, 100))

        document.getArray('foo').insert(0, ['bar'])

        return document
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onSynced: () => {
        Server.destroy()

        const value = ydoc.getArray('foo').get(0)
        assert.strictEqual(value, 'bar')

        done()
      },
    })
  })
})
