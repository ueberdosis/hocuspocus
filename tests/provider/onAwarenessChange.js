import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

let anotherClient
const ydoc = new Y.Doc()

context('provider/onAwarenessChange', () => {
  it('onAwarenessChange callback is executed', done => {
    const server = new Hocuspocus()

    server.configure({ port: 4000 }).listen()

    let called = false
    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onConnect: () => {
        client.setAwarenessField('foo', 'bar')
      },
      onAwarenessChange: ({ states }) => {
        if (called) return
        called = true

        server.destroy()
        client.destroy()

        assert.strictEqual(states.length, 1)
        assert.strictEqual(states[0].foo, 'bar')

        done()
      },
    })
  })

  it('onAwarenessChange callback is executed on provider destroy', done => {
    const server = new Hocuspocus()

    server.configure({ port: 4000 }).listen()

    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      maxAttempts: 1,
      onConnect: () => {
        client.destroy()
      },
      onAwarenessChange: ({ states }) => {
        server.destroy()

        assert.strictEqual(states.length, 0)
        done()
      },
    })
  })

  it('gets the current awareness states from the server', done => {
    const ydoc = new Y.Doc()

    const server = new Hocuspocus()
    server.configure({
      port: 4000,
    })
    server.enableDebugging()
    server.listen()

    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onSynced: () => {
        assert.deepStrictEqual(server.getMessageLogs(), [
          {
            category: 'SyncStep1',
            direction: 'in',
            type: 'Sync',
          },
          {
            category: 'SyncStep2',
            direction: 'out',
            type: 'Sync',
          },
          {
            category: 'SyncStep1',
            direction: 'out',
            type: 'Sync',
          },
          {
            category: 'Update',
            direction: 'in',
            type: 'Awareness',
          },
          {
            category: 'Update',
            direction: 'out',
            type: 'Awareness',
          },
        ])

        server.destroy()
        client.destroy()

        done()
      },
    })

    client.setAwarenessField('foo', 'bar')
  })

  it('shares awareness state with other users', done => {
    const server = new Hocuspocus()

    server.configure({ port: 4000 }).listen()

    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onConnect: () => {
        client.setAwarenessField('name', 'player1')
      },
      onAwarenessChange: ({ states }) => {
        const player2 = !!states.filter(state => state.name === 'player2').length

        if (player2) {
          assert.strictEqual(player2, true)

          server.destroy()
          anotherClient.destroy()
          client.destroy()

          done()
        }
      },
    })

    anotherClient = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onConnect: () => {
        anotherClient.setAwarenessField('name', 'player2')
      },
      onAwarenessChange: ({ states }) => {
        const player1 = !!states.filter(state => state.name === 'player1').length

        if (player1) {
          assert.strictEqual(player1, true)
        }
      },
    })
  })

  it('does not share awareness state with users in other documents', done => {
    const server = new Hocuspocus()

    server.configure({ port: 4000 }).listen()

    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onConnect: () => {
        server.destroy()
        client.destroy()
        anotherClient.destroy()
        done()
      },
      onAwarenessChange: ({ states }) => {
        const player2 = !!states.filter(state => state.name === 'player2').length

        if (player2) {
          throw new Error('Awareness state leaked!')
        }
      },
    })

    anotherClient = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-completly-different-and-unrelated-document',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onConnect: () => {
        anotherClient.setAwarenessField('name', 'player2')
      },
    })
  })
})
