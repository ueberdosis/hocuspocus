import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

let client
const ydoc = new Y.Doc()

context('provider/onAuthenticationFailed', () => {
  it('executes the onAuthenticationFailed callback', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async onAuthenticate({ token }) {
        throw new Error()
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      token: 'SUPER-SECRET-TOKEN',
      onAuthenticationFailed: () => {
        client.destroy()
        server.destroy()

        done()
      },
    })
  })
})
