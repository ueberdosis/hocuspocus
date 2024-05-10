import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.js'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

test('executes the onLoadDocument callback', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onLoadDocument() {
        t.pass()
        resolve('done')
      },
    })

    newHocuspocusProvider(server)
  })
})

test('executes the onLoadDocument callback from an extension', async t => {
  await new Promise(async resolve => {
    class CustomExtension {
      async onLoadDocument() {
        t.pass()
        resolve('done')
      }
    }

    const server = await newHocuspocus({
      extensions: [
        new CustomExtension(),
      ],
    })

    newHocuspocusProvider(server)
  })
})

test('passes the context and connection to the onLoadDocument callback', async t => {
  await new Promise(async resolve => {
    const mockContext = {
      user: 123,
    }

    const server = await newHocuspocus({
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
  await new Promise(async resolve => {
    const server = await newHocuspocus({
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
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      onLoadDocument({ document }) {
        // delay more accurately simulates a database fetch
        return new Promise(async resolve => {
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

test('multiple simultaneous connections do not create multiple documents', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      onLoadDocument({ document }) {
        // delay more accurately simulates a database fetch
        return new Promise(async resolve => {
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

test('multiple simultaneous connections wait for the document to be loaded', async t => {
  t.plan(6)

  await new Promise(async resolve => {
    let resolveOnLoadDocument: () => void = () => {}

    const server = await newHocuspocus({
      onLoadDocument({ document }) {
        // delay more accurately simulates a database fetch
        return new Promise(async innerResolve => {
          resolveOnLoadDocument = () => {
            document.getArray('foo').insert(0, ['bar'])
            innerResolve(document)
          }
        })
      },
    })

    const provider1 = newHocuspocusProvider(server)
    const provider2 = newHocuspocusProvider(server)
    let provider1Synced = false
    let provider2Synced = false

    provider1.on('synced', () => {
      provider1Synced = true
      const value = provider1.document.getArray('foo').get(0)
      t.is(value, 'bar')
    })
    provider2.on('synced', () => {
      provider2Synced = true
      const value = provider2.document.getArray('foo').get(0)
      t.is(value, 'bar')
    })

    await sleep(100)

    t.false(provider1Synced, 'provider1Synced')
    t.false(provider2Synced, 'provider2Synced')

    resolveOnLoadDocument()

    await sleep(100)

    t.true(provider1Synced, 'provider1Synced')
    t.true(provider2Synced, 'provider2Synced')

    resolve('done')
  })
})

test('has the server instance', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
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
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onLoadDocument() {
        throw new Error()
      },
    })

    newHocuspocusProvider(server, {
      onClose() {
        t.pass()
        resolve('done')
      },
    })
  })
})

test('stops when an error is thrown in onLoadDocument, even when authenticated', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onAuthenticate() {
        return true
      },
      async onLoadDocument() {
        throw new Error()
      },
    })

    newHocuspocusProvider(server, {
      token: 'super-secret-token',
      onAuthenticationFailed() {
        t.pass()
        resolve('done')
      },
      onClose() {
        t.fail()
      },
    })
  })
})
