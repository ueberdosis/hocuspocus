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
    })
    server.enableDebugging()
    server.listen()
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
      // create '#1'
      onSynced: () => {
        const fragment = ydoc.getXmlFragment('XMLFragment')
        fragment.insert(fragment.length, [
          new Y.XmlText('#1'),
        ])

        assert.strictEqual(fragment.toString(), '#1')

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
      // modify '#1#2'
      onSynced: () => {
        const fragment = ydoc.getXmlFragment('XMLFragment')
        fragment.insert(fragment.length, [
          new Y.XmlText('#2'),
        ])

        assert.strictEqual(fragment.toString(), '#1#2')

        client.destroy()
        done()
      },
    })
  })

  it('document can be restored', done => {
    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: theLastYdoc,
      WebSocketPolyfill: WebSocket,
      // restore '#1#2'
      onSynced: () => {
        console.log(server.getMessageLogs())
        // assert.deepStrictEqual(server.getMessageLogs(), [])

        const fragment = theLastYdoc.getXmlFragment('XMLFragment')
        assert.strictEqual(fragment.toString(), '#1#2')

        client.destroy()
        done()
      },
    })
  })
})
