import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '@hocuspocus/server'
import { HocuspocusProvider } from '@hocuspocus/provider'

let client

context('server/onStoreDocument', () => {
  it('calls the onStoreDocument hook before the document is removed from memory', done => {
    const ydoc = new Y.Doc()
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async onStoreDocument() {
        server.destroy()
        client.destroy()
        done()
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })

    client.on('synced', () => {
      client.destroy()
    })
  })

  it('doesn’t remove the document from memory when there’s a new connection established during onStoreDocument is called', done => {
    const ydoc = new Y.Doc()
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async onStoreDocument() {
        return new Promise((resolve, reject) => {
          // Sleep for 1s …
          setTimeout(() => {
            // Done!
            resolve()
          }, 1000)
        })
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })

    const anotherClient = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      connect: false,
    })

    client.on('synced', () => {
      client.destroy()

      setTimeout(() => {
        anotherClient.connect()
      }, 100)

      setTimeout(() => {
        assert.strictEqual(server.getDocumentsCount(), 1)

        server.destroy()
        anotherClient.destroy()
        done()
      }, 1100)
    })
  })

  // TODO: Timing issues when all tests run
  it.skip('removes the document from memory when there’s no connection after onStoreDocument is called', done => {
    const ydoc = new Y.Doc()
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async onStoreDocument() {
        return new Promise((resolve, reject) => {
          // Sleep for 1s …
          setTimeout(() => {
            // Done!
            resolve()
          }, 1000)
        })
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })

    client.on('synced', () => {
      client.destroy()
    })

    client.on('destroy', () => {
      // Check if the document is removed from memory …
      setTimeout(() => {
        assert.strictEqual(server.getDocumentsCount(), 0)

        server.destroy()
        done()
      }, 1100)
    })
  })

  it('onStoreDocument callback receives document updates', done => {
    const ydoc = new Y.Doc()
    const server = new Hocuspocus()

    let triggered = false

    server.configure({
      port: 4000,
      async onStoreDocument({ document }) {
        if (triggered) {
          return
        }

        triggered = true

        const value = document.getArray('foo').get(0)
        assert.strictEqual(value, 'bar')

        server.destroy()
        client.destroy()
        done()
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })

    client.on('synced', () => {
      ydoc.getArray('foo').insert(0, ['bar'])
    })
  })

  it('debounces document changes for onStoreDocument hooks', done => {
    const ydoc = new Y.Doc()
    const server = new Hocuspocus()

    let executedOnChange = 0
    let executedOnStoreDocument = 0

    server.configure({
      port: 4000,
      debounce: 10,
      async onChange() {
        executedOnChange += 1
      },
      async onStoreDocument() {
        executedOnStoreDocument += 1
      },
      async onDestroy() {
        assert.strictEqual(executedOnChange, 5)
        assert.strictEqual(executedOnStoreDocument, 1)

        client.destroy()
        done()
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })

    client.on('synced', () => {
      ydoc.getArray('foo').push(['foo'])
      ydoc.getArray('foo').push(['bar'])
      ydoc.getArray('foo').push(['barfoo'])
      ydoc.getArray('foo').push(['foobar'])
      ydoc.getArray('foo').push(['foofoo'])

      setTimeout(() => {
        server.destroy()
      }, 100)
    })
  })

  it('executes onStoreDocument callback from an extension', done => {
    const ydoc = new Y.Doc()
    const server = new Hocuspocus()
    let triggered = false

    class CustomExtension {
      async onStoreDocument({ document }) {
        if (triggered) {
          return
        }

        triggered = true

        const value = document.getArray('foo').get(0)
        assert.strictEqual(value, 'bar')

        server.destroy()
        client.destroy()
        done()
      }
    }

    server.configure({
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
    })

    client.on('synced', () => {
      ydoc.getArray('foo').insert(0, ['bar'])
    })
  })

  it('stops when one of the onStoreDocument hooks throws an error', done => {
    const ydoc = new Y.Doc()
    const server = new Hocuspocus()
    let triggered = false

    class BreakingTheChain {
      async onStoreDocument() {
        setTimeout(() => {
          if (triggered) {
            return
          }

          triggered = true

          server.destroy()
          client.destroy()
          done()
        }, 100)

        // Stop it!
        throw new Error()
      }
    }

    class NotExecuted {
      async onStoreDocument() {
        // This MUST NOT be executed.
        server.destroy()
        client.destroy()
        done()
      }
    }

    server.configure({
      port: 4000,
      extensions: [
        new BreakingTheChain(),
        new NotExecuted(),
      ],
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })

    client.on('synced', () => {
      ydoc.getArray('foo').insert(0, ['bar'])
    })
  })

  it('has the server instance', done => {
    const ydoc = new Y.Doc()
    const server = new Hocuspocus()
    let triggered = false

    server.configure({
      port: 4000,
      async onStoreDocument({ instance }) {
        if (triggered) {
          return
        }

        triggered = true
        assert.strictEqual(instance, server)

        client.destroy()
        server.destroy()

        done()
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })

    client.on('synced', () => {
      ydoc.getArray('foo').insert(0, ['bar'])
    })
  })

  it('runs hooks in the given order', done => {
    const ydoc = new Y.Doc()
    const server = new Hocuspocus()
    const triggered = []

    class Running {
      async onStoreDocument() {
        triggered.push('one')
      }
    }

    class BreakTheChain {
      async onStoreDocument() {
        triggered.push('two')
        throw Error()
      }
    }

    class NotRunning {
      async onStoreDocument() {
        triggered.push('three')
      }
    }

    server.configure({
      port: 4000,
      extensions: [
        new Running(),
        new BreakTheChain(),
        new NotRunning(),
      ],
      // lowest priority
      async onStoreDocument() {
        triggered.push('four')
      },
      async afterStoreDocument() {
        assert.deepStrictEqual(triggered, [
          'one',
          'two',
        ])
        server.destroy()
        done()
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })

    client.on('synced', () => {
      client.destroy()
    })
  })

  it('allows to overwrite the order of extension with a priority', done => {
    const ydoc = new Y.Doc()
    const server = new Hocuspocus()
    const triggered = []

    class Running {
      async onStoreDocument() {
        triggered.push('one')
      }
    }

    class BreakTheChain {
      async onStoreDocument() {
        triggered.push('two')
        throw Error()
      }
    }

    class NotRunning {
      async onStoreDocument() {
        triggered.push('three')
      }
    }

    class HighPriority {
      priority = 1000

      async onStoreDocument() {
        triggered.push('zero')
      }
    }

    server.configure({
      port: 4000,
      afterStoreDocument: async () => {
        assert.deepStrictEqual(triggered, [
          'zero',
          'one',
          'two',
        ])
        server.destroy()
        done()
      },
      extensions: [
        new Running(),
        new BreakTheChain(),
        new NotRunning(),
        new HighPriority(),
      ],
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })

    client.on('synced', () => {
      client.destroy()
    })
  })
})
