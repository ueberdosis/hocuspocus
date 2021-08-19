import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

let client
const ydoc = new Y.Doc()

context('provider/onAuthenticated', () => {
  it('executes the onAuthenticated callback', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
      async onAuthenticate({ token }) {
        if (token !== 'SUPER-SECRET-TOKEN') {
          throw new Error()
        }
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      token: 'SUPER-SECRET-TOKEN',
      onAuthenticated: () => {
        client.destroy()
        Server.destroy()

        done()
      },
    })
  })
})
