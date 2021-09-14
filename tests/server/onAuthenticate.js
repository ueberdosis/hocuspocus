import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

let client
const ydoc = new Y.Doc()

context('server/onAuthenticate', () => {
  it('executes the onAuthenticate callback', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
      async onAuthenticate() {
        client.destroy()
        Server.destroy()

        done()
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      maxAttempts: 1,
      token: 'SUPER-SECRET-TOKEN',
    })
  })

  it('executes the onAuthenticate callback from a custom extension', done => {
    const Server = new Hocuspocus()

    class CustomExtension {
      async onAuthenticate() {
        client.destroy()
        Server.destroy()

        done()
      }
    }

    Server.configure({
      port: 4000,
      extensions: [
        new CustomExtension(),
      ],
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      maxAttempts: 1,
      token: 'SUPER-SECRET-TOKEN',
    })
  })

  it('passes context from onAuthenticate to onCreateDocument', done => {
    const Server = new Hocuspocus()

    const mockContext = {
      user: 123,
    }

    Server.configure({
      port: 4000,
      onAuthenticate() {
        return mockContext
      },
      onCreateDocument({ context }) {
        assert.deepStrictEqual(context, mockContext)

        client.destroy()
        Server.destroy()
        done()
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      maxAttempts: 1,
      token: 'SUPER-SECRET-TOKEN',
    })
  })

  it('ignores the authentication token when having no onAuthenticate hook', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      maxAttempts: 1,
      token: 'SUPER-SECRET-TOKEN',
      onConnect: () => {
        client.destroy()
        Server.destroy()

        done()
      },
    })
  })

  it('has the authentication token', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
      async onAuthenticate({ token }) {
        assert.strictEqual(token, 'SUPER-SECRET-TOKEN')

        client.destroy()
        Server.destroy()

        done()
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      maxAttempts: 1,
      token: 'SUPER-SECRET-TOKEN',
    })
  })

  it('stops when the onAuthenticate hook throws an Error', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
      async onAuthenticate() {
        throw new Error()
      },
      // MUST NOT BE CALLED
      async onCreateDocument() {
        console.log('WARNING: When onAuthenticate fails onCreateDocument must not be called.')
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      maxAttempts: 1,
      onClose: () => {
        client.destroy()
        Server.destroy()

        done()
      },
      token: 'SUPER-SECRET-TOKEN',
    })
  })

  it('connects with the correct token', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
      async onAuthenticate({ token }) {
        if (token !== 'SUPER-SECRET-TOKEN') {
          throw new Error()
        }
      },
      async onCreateDocument() {
        client.destroy()
        Server.destroy()

        done()
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      maxAttempts: 1,
      token: 'SUPER-SECRET-TOKEN',
    })
  })
})
