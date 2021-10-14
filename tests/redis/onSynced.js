import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { Redis } from '../../packages/redis/src'
import { HocuspocusProvider } from '../../packages/provider/src'
import flushRedis from '../utils/flushRedis'

const ydoc = new Y.Doc()
const anotherYdoc = new Y.Doc()
const theLastYdoc = new Y.Doc()
const server = new Hocuspocus()

context.only('redis/onSynced', () => {
  before(() => {
    flushRedis()

    server.configure({
      port: 4000,
      extensions: [
        new Redis({
          host: process.env.REDIS_HOST || '127.0.0.1',
          port: process.env.REDIS_PORT || 6379,
        }),
      ],
    }).listen()
  })

  after(() => {
    server.destroy()

    flushRedis()
  })

  it('document is persisted', done => {
    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      broadcast: false,
      onSynced: () => {
        const fragment = ydoc.getXmlFragment('XMLFragment')

        for (let count = 1; count <= 3; count += 1) {
          const text = new Y.XmlText(`#${count}`)
          fragment.insert(fragment.length, [text])
        }

        assert.strictEqual(fragment.toString(), '#1#2#3')

        client.destroy()
        done()
      },
    })
  })

  it('document can be modified', done => {
    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: anotherYdoc,
      WebSocketPolyfill: WebSocket,
      onSynced: () => {
        const fragment = ydoc.getXmlFragment('XMLFragment')

        for (let count = 1; count <= 3; count += 1) {
          const text = new Y.XmlText(`#${count}`)
          fragment.insert(fragment.length, [text])
        }

        assert.strictEqual(fragment.toString(), '#1#2#3#1#2#3')

        client.destroy()
        done()
      },
    })
  })

  it('document can be restored', done => {
    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: anotherYdoc,
      WebSocketPolyfill: WebSocket,
      onSynced: () => {
        const fragment = anotherYdoc.getXmlFragment('XMLFragment')
        assert.strictEqual(fragment.toString(), '#1#2#3#1#2#3')

        client.destroy()
        done()
      },
    })
  })
})
