import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

let client
const ydoc = new Y.Doc()

context('provider/onAuthenticationFailed', () => {
  it('executes the onAuthenticationFailed callback', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
      async onAuthenticate({ authentication }) {
        throw new Error()
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      authentication: 'SUPER-SECRET-TOKEN',
      onAuthenticationFailed: () => {
        client.destroy()
        Server.destroy()

        done()
      },
    })
  })
})
