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
          log: (...args) => console.log('server:', ...args),
        }),
      ],
    }).listen()

    server1.configure({
      port: 4001,
      extensions: [
        new PubSub({
          ...opts,
          log: (...args) => console.log('server1:', ...args),

        }),
      ],
    }).listen()
  })

  after(() => {
    server.destroy()
    server1.destroy()
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
        assert.strictEqual(states[1].client, 'Second client')

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
