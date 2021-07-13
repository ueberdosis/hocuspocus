import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

let client
let anotherClient
const ydoc = new Y.Doc()

context('provider/onAwarenessChange', () => {
  afterEach(() => {
    client.destroy()
  })

  it('onAwarenessChange callback is executed', done => {
    const Server = new Hocuspocus()

    Server.configure({ port: 4000 }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onConnect: () => {
        client.setAwarenessField('foo', 'bar')
      },
      onAwarenessChange: ({ states }) => {
        Server.destroy()

        assert.strictEqual(states.length, 1)
        assert.strictEqual(states[0].foo, 'bar')

        done()
      },
    })
  })

  it('shares awareness state with other users', done => {
    const Server = new Hocuspocus()

    Server.configure({ port: 4000 }).listen()

    client = new HocuspocusProvider({
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

          Server.destroy()
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
      onAwarenessChange: ({ states }) => {
        const player1 = !!states.filter(state => state.name === 'player1').length

        if (player1) {
          assert.strictEqual(player1, true)
        }
      },
    })
  })

  it('does not share awareness state with users in other documents', done => {
    const Server = new Hocuspocus()

    Server.configure({ port: 4000 }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onConnect: () => {
        setTimeout(() => {
          Server.destroy()
          anotherClient.destroy()
          done()
        }, 100)
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
