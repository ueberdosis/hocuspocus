import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '@hocuspocus/server'
import { Redis } from '@hocuspocus/extension-redis'
import { HocuspocusProvider } from '@hocuspocus/provider'

const server = new Hocuspocus()
const anotherServer = new Hocuspocus()

const redisConfiguration = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
}

context('extension-redis/onAwarenessChange', () => {
  before(() => {
    server.configure({
      port: 4000,
      extensions: [
        new Redis({
          ...redisConfiguration,
          identifier: 'server',
          log: () => {},
          // log: (...args) => console.log('server:', ...args),
        }),
      ],
    }).listen()

    anotherServer.configure({
      port: 4001,
      extensions: [
        new Redis({
          ...redisConfiguration,
          identifier: 'anotherServer',
          log: () => {},
          // log: (...args) => console.log('anotherServer:', ...args),
        }),
      ],
    }).listen()
  })

  after(() => {
    server.destroy()
    anotherServer.destroy()
  })

  it('syncs existing awareness state', done => {
    const ydoc = new Y.Doc()
    const anotherYdoc = new Y.Doc()

    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      broadcast: false,
      onSynced: () => {
        // once we're setup change awareness on the client, to get to anotherClient
        // we need to pass through the pubsub extension:
        // anotherClient -> anotherServer -> pubsub -> server -> client
        client.setAwarenessField('client', 'First client')

        // start a new anotherClient against the other server and expect to receive
        // the existing awareness state from client
        const anotherClient = new HocuspocusProvider({
          url: 'ws://127.0.0.1:4001',
          name: 'hocuspocus-test',
          document: anotherYdoc,
          WebSocketPolyfill: WebSocket,
          broadcast: false,
          onAwarenessChange: ({ states }) => {
            assert.strictEqual(states.length, 2)

            const state = states.find(s => s.clientId === client.document.clientID)
            assert.strictEqual(state.client, 'First client')

            // Make sure to not trigger `onAwarenessChange` again
            anotherClient.removeAllListeners()

            client.destroy()
            anotherClient.destroy()
            done()
          },
        })
      },
    })
  })

  // TODO: Why is that failing?
  it.skip('syncs awareness between servers and clients', done => {
    const ydoc = new Y.Doc()
    const anotherYdoc = new Y.Doc()
    let anotherClient

    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      broadcast: false,
      onAwarenessChange: ({ states }) => {
        assert.strictEqual(states.length, 2)

        // const state = states.find(s => s.clientId === anotherClient.document.clientID)
        // assert.strictEqual(state.client, 'Second client')

        // Make sure to not trigger `onAwarenessChange` again
        client.removeAllListeners()

        client.destroy()
        anotherClient.destroy()
        done()
      },
    })

    anotherClient = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4001',
      name: 'hocuspocus-test',
      document: anotherYdoc,
      WebSocketPolyfill: WebSocket,
      broadcast: false,
      onSynced: () => {
        // once we're setup change awareness on anotherClient, to get to client it will
        // need to pass through the pubsub extension:
        // anotherClient -> anotherServer -> pubsub -> server -> client
        anotherClient.setAwarenessField('client', 'Second client')
      },
    })
  })
})
