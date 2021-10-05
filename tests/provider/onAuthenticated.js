import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

let client
const ydoc = new Y.Doc()

context('provider/onAuthenticated', () => {
  it('executes the onAuthenticated callback', done => {
    const server = new Hocuspocus()

    server.configure({
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
        server.destroy()

        done()
      },
    })
  })

  it('executes the onAuthenticated callback when token is provided as a function that returns a promise', done => {
    const server = new Hocuspocus()

    server.configure({
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
            token: () => Promise.resolve('SUPER-SECRET-TOKEN'),
      onAuthenticated: () => {
        client.destroy()
        server.destroy()

        done()
      },
    })
  })

  it('executes the onAuthenticated callback when token is provided as a function that returns a string', done => {
    const server = new Hocuspocus()

    server.configure({
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
            token: () => 'SUPER-SECRET-TOKEN',
      onAuthenticated: () => {
        client.destroy()
        server.destroy()

        done()
      },
    })
  })
})
