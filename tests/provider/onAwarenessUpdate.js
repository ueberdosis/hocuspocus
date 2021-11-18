import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '@hocuspocus/server'
import { HocuspocusProvider } from '@hocuspocus/provider'

let anotherClient
const ydoc = new Y.Doc()

context('provider/onAwarenessUpdate', () => {
  it('onAwarenessUpdate callback is executed', done => {
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
      onAwarenessUpdate: ({ states }) => {
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
      onAwarenessUpdate: ({ states }) => {
        const player2 = !!states.filter(state => state.name === 'player2').length

        if (player2) {
          assert.strictEqual(player2, true)

          server.destroy()
          client.destroy()
          anotherClient.destroy()
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
      onAwarenessUpdate: ({ states }) => {
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
      onAwarenessUpdate: ({ states }) => {
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
