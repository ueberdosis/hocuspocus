import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { PubSub } from '../../packages/pubsub/src'
import { HocuspocusProvider } from '../../packages/provider/src'

const server = new Hocuspocus()
const server1 = new Hocuspocus()

const opts = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
}

context('pubsub/onAwarenessChange', () => {
  before(() => {
    server.configure({
      port: 4000,
      extensions: [
        new PubSub({
          ...opts,
          instanceName: 'server',
          log: (...args) => console.log('server:', ...args),
        }),
      ],
    }).listen()

    server1.configure({
      port: 4001,
      extensions: [
        new PubSub({
          ...opts,
          instanceName: 'server1',
          log: (...args) => console.log('server1:', ...args),

        }),
      ],
    }).listen()
  })

  after(() => {
    server.destroy()
    server1.destroy()
  })

  it('syncs existing awareness state', done => {
    const ydoc = new Y.Doc()
    const ydoc1 = new Y.Doc()

    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      maxAttempts: 1,
      broadcast: false,
      onSynced: () => {
        // once we're setup change awareness on the client, to get to client1
        // we need to pass through the pubsub extension:
        // client1 -> server1 -> pubsub -> server -> client
        client.setAwarenessField('client', 'First client')

        // start a new client1 against the other server and expect to receive
        // the existing awareness state from client
        const client1 = new HocuspocusProvider({
          url: 'ws://127.0.0.1:4001',
          name: 'hocuspocus-test',
          document: ydoc1,
          WebSocketPolyfill: WebSocket,
          maxAttempts: 1,
          broadcast: false,
          onAwarenessChange: ({ states }) => {
            assert.strictEqual(states.length, 2)

            const state = states.find(s => s.clientId === client.document.clientID)
            assert.strictEqual(state.client, 'First client')

            client.destroy()
            client1.destroy()
            done()
          },
        })
      },
    })
  })

  it('syncs awareness between servers and clients', done => {
    const ydoc = new Y.Doc()
    const ydoc1 = new Y.Doc()
    let client1

    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      maxAttempts: 1,
      broadcast: false,
      onAwarenessChange: ({ states }) => {
        assert.strictEqual(states.length, 2)

        const state = states.find(s => s.clientId === client1.document.clientID)
        assert.strictEqual(state.client, 'Second client')

        client.destroy()
        client1.destroy()
        done()
      },
    })

    client1 = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4001',
      name: 'hocuspocus-test',
      document: ydoc1,
      WebSocketPolyfill: WebSocket,
      maxAttempts: 1,
      broadcast: false,
      onSynced: () => {
        // once we're setup change awareness on client1, to get to client it will
        // need to pass through the pubsub extension:
        // client1 -> server1 -> pubsub -> server -> client
        client1.setAwarenessField('client', 'Second client')
      },
    })
  })
})
