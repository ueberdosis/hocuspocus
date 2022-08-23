import test from 'ava'
import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils'

test('still executes the deprecated onCreateDocument callback', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      async onCreateDocument() {
        t.pass()
        resolve('done')
      },
    })

    newHocuspocusProvider(server)
  })
})

test('executes the onLoadDocument callback', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      async onLoadDocument() {
        t.pass()
        resolve('done')
      },
    })

    newHocuspocusProvider(server)
  })
})

test('executes the onLoadDocument callback from an extension', async t => {
  await new Promise(resolve => {
    class CustomExtension {
      async onLoadDocument() {
        t.pass()
        resolve('done')
      }
    }

    const server = newHocuspocus({
      extensions: [
        new CustomExtension(),
      ],
    })

    newHocuspocusProvider(server)
  })
})

test('passes the context and connection to the onLoadDocument callback', async t => {
  await new Promise(resolve => {
    const mockContext = {
      user: 123,
    }

    const server = newHocuspocus({
      async onConnect({ connection }) {
        connection.readOnly = true
        return mockContext
      },
      async onLoadDocument({ context, connection }) {
        t.deepEqual(context, mockContext)
        t.deepEqual(connection, {
          readOnly: true,
          requiresAuthentication: false,
          isAuthenticated: false,
        })

        resolve('done')
      },
    })

    newHocuspocusProvider(server)
  })
})

test('sets the provider to readOnly', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      async onLoadDocument({ connection }) {
        connection.readOnly = true
      },
    })

    newHocuspocusProvider(server, {
      onSynced() {
        server.documents.get('hocuspocus-test')?.connections.forEach(conn => {
          t.is(conn.connection.readOnly, true)
        })
        resolve('done')
      },
    })
  })
})

test('creates a new document in the onLoadDocument callback', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      onLoadDocument({ document }) {
      // delay more accurately simulates a database fetch
        return new Promise(resolve => {
          setTimeout(() => {
            document.getArray('foo').insert(0, ['bar'])
            resolve(document)
          }, 200)
        })
      },
    })

    const provider = newHocuspocusProvider(server, {
      onSynced() {
        const value = provider.document.getArray('foo').get(0)
        t.is(value, 'bar')

        resolve('done')
      },
    })
  })
})

test('multiple simultanous connections do not create multiple documents', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      onLoadDocument({ document }) {
      // delay more accurately simulates a database fetch
        return new Promise(resolve => {
          setTimeout(() => {
            document.getArray('foo').insert(0, ['bar'])
            resolve(document)
          }, 200)
        })
      },
    })

    const provider = newHocuspocusProvider(server)

    newHocuspocusProvider(server)

    provider.on('synced', () => {
      t.is(server.documents.size, 1)

      resolve('done')
    })
  })
})

test('has the server instance', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      async onLoadDocument({ instance }) {
        t.is(instance, server)

        resolve('done')
      },
    })

    newHocuspocusProvider(server)
  })
})

/**
 * When onLoadDocument fails (for whatever reason), the connection attempt will fail.
 */
test('stops when an error is thrown in onLoadDocument', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      async onLoadDocument() {
        throw new Error()
      }
    })

    t.is(0, server.documents.size);

    newHocuspocusProvider(server, {
      onClose() {
        t.is(0, server.documents.size);
        t.pass()
        resolve('done')
      }
    })
  })
})

test('stops when an error is thrown in onLoadDocument, even when authenticated', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      async onAuthenticate() {
        return true
      },
      async onLoadDocument() {
        throw new Error()
      }
    })

    newHocuspocusProvider(server, {
      token: 'super-secret-token',
      onClose() {
        t.pass()
        resolve('done')
      }
    })
  })
})
