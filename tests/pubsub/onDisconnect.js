import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '@hocuspocus/server'
import { PubSub } from '@hocuspocus/extension-pubsub'
import { HocuspocusProvider } from '@hocuspocus/provider'

const server = new Hocuspocus()

const opts = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
}

context('pubsub/onDisconnect', () => {
  it('calls persist after last client disconnects', done => {
    const ydoc = new Y.Doc()
    let client

    server.configure({
      port: 4000,
      extensions: [
        new PubSub({
          ...opts,
          instanceName: 'server',
          log: () => {},
          // log: (...args) => console.log('server:', ...args),
          onPersist: doc => {
            assert.strictEqual(ydoc.getArray('foo').get(0), doc.getArray('foo').get(0))

            client.destroy()
            server.destroy()
            done()
          },
        }),
      ],
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      maxAttempts: 1,
      broadcast: false,
    })

    client.on('synced', () => {
      ydoc.getArray('foo').insert(0, ['bar'])
      client.disconnect()
    })
  }).timeout(5000)
})
