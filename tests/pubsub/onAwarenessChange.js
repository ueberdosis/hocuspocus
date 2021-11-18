import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '@hocuspocus/server'
import { PubSub } from '@hocuspocus/extension-pubsub'
import { HocuspocusProvider } from '@hocuspocus/provider'

const server = new Hocuspocus()
const anotherServer = new Hocuspocus()

const redisConfiguration = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
}

context('pubsub/onAwarenessChange', () => {
  before(() => {
    server.configure({
      port: 4000,
      extensions: [
        new PubSub({
          ...redisConfiguration,
          instanceName: 'server',
          log: (...args) => console.log('server:', ...args),
        }),
      ],
    }).listen()

    anotherServer.configure({
      port: 4001,
      extensions: [
        new PubSub({
          ...redisConfiguration,
          instanceName: 'anotherServer',
          log: (...args) => console.log('anotherServer:', ...args),
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
            // assert.strictEqual(states.length, 2)

            // const state = states.find(s => s.clientId === client.document.clientID)
            // assert.strictEqual(state.client, 'First client')

            anotherClient.destroy()
            client.destroy()
            done()
          },
        })
      },
    })
  })

  it('syncs awareness between servers and clients', done => {
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

        const state = states.find(s => s.clientId === anotherClient.document.clientID)
        assert.strictEqual(state.client, 'Second client')

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
