import { HocuspocusProvider } from '@hocuspocus/provider'
import test from 'ava'
import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils/index.js'

test('executes the onConnect callback', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onConnect() {
        t.pass()
        resolve('done')
      },
    })

    newHocuspocusProvider(server)
  })
})

test('refuses connection when an error is thrown', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onConnect() {
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

test('executes the onConnect callback from an extension', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus()

    class CustomExtension {
      async onConnect() {
        t.pass()
        resolve('done')
      }
    }

    server.configure({
      extensions: [
        new CustomExtension(),
      ],
    })

    newHocuspocusProvider(server)
  })
})

test('has the document name', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onConnect({ documentName }) {
        t.is(documentName, 'hocuspocus-test')
        resolve('done')
      },
    })

    newHocuspocusProvider(server)
  })
})

test('sets the provider to readOnly', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onConnect({ connection }) {
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

const weirdDocumentNames = [
  'not-weird',
  'äöü',
  '<>{}|^ß',
  'with space',
  'with/slash',
  'with\backslash',
  'a-very-long-document-name-which-should-not-make-any-problems-at-all',
  '🌟',
  ':',
  '—',
  '漢',
  'triple   space',
  '*',
]

weirdDocumentNames.forEach(weirdDocumentName => {
  test(`encodes weird document names: "${weirdDocumentName}"`, async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onConnect({ documentName }) {
          t.is(documentName, weirdDocumentName)

          resolve('done')
        },
      })

      newHocuspocusProvider(server, {
        name: weirdDocumentName,
      })
    })
  })
})

test('stops when the onConnect hook throws an Error', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      onConnect() {
        throw new Error()
      },
      // MUST NOT BE CALLED
      async onLoadDocument() {
        t.fail('WARNING: When onConnect fails onLoadDocument must not be called.')
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

test('stops when the onConnect hook returns a rejecting promise', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      onConnect() {
        return Promise.reject()
      },
      // MUST NOT BE CALLED
      async onLoadDocument() {
        t.fail('WARNING: When onConnect fails onLoadDocument must not be called.')
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

test('has the request parameters', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onConnect({ requestParameters }) {
        t.is(requestParameters instanceof URLSearchParams, true)
        t.is(requestParameters.has('foo'), true)
        t.is(requestParameters.get('foo'), 'bar')

        resolve('done')
      },
    })

    newHocuspocusProvider(server, {}, {
      parameters: {
        foo: 'bar',
      },
    })
  })
})

test('has the request headers', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onConnect({ requestHeaders }) {
        t.is(requestHeaders.connection !== undefined, true)
        resolve('done')
      },
    })

    newHocuspocusProvider(server)
  })
})

test('has the whole request', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onConnect({ request }) {
        t.is(request.url, '/')
        resolve('done')
      },
    })

    newHocuspocusProvider(server)
  })
})

test('has the socketId', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onConnect({ socketId }) {
        t.is(socketId !== undefined, true)
        resolve('done')
      },
    })

    newHocuspocusProvider(server)
  })
})

test('has the server instance', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onConnect({ instance }) {
        t.is(instance, server)
        resolve('done')
      },
    })

    newHocuspocusProvider(server)
  })
})

test('defaults to readOnly = false', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onConnect({ connection }) {
        t.is(connection.readOnly, false)
        resolve('done')
      },
    })

    newHocuspocusProvider(server)
  })
})

test('cleans up correctly when provider disconnects during onLoadDocument', async t => {
  await new Promise(async resolve => {
    let provider: HocuspocusProvider

    const server = await newHocuspocus({
      onLoadDocument: async () => {
        provider.configuration.websocketProvider.disconnect()
        provider.disconnect()

        // pretent we loaded data from async source
        await sleep(100)
      },
    })

    provider = newHocuspocusProvider(server, {
      name: 'super-unique-name',
      async onDisconnect() {
        await sleep(100)

        t.is(server.documents.get('super-unique-name'), undefined, 'no documents')
        resolve('done')
      },
    })

  })
})

test('the connections count is correct', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async connected() {
        t.is(server.getConnectionsCount(), 1)
        resolve('done')
      },
    })

    newHocuspocusProvider(server)
  })
})

test('has connection.readOnly', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onConnect({ connection }) {
        t.is(connection.readOnly, false)
        resolve('done')
      },
    })

    newHocuspocusProvider(server)
  })
})

test('has connection.requiresAuthentication', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onConnect({ connection }) {
        t.is(connection.requiresAuthentication, false)
        resolve('done')
      },
    })

    newHocuspocusProvider(server)
  })
})

test('has connection.isAuthenticated', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onConnect({ connection }) {
        t.is(connection.isAuthenticated, false)
        resolve('done')
      },
    })

    newHocuspocusProvider(server)
  })
})

test('has the request', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onConnect({ request }) {
        t.is(request.complete, true)
        resolve('done')
      },
    })

    newHocuspocusProvider(server)
  })
})
