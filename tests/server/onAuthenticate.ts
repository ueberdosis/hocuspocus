import test from 'ava'
import { onAuthenticatePayload, onLoadDocumentPayload } from '@hocuspocus/server'
import { WebSocketStatus } from '@hocuspocus/provider'
import { newHocuspocus, newHocuspocusProvider, newHocuspocusProviderWebsocket } from '../utils/index.js'
import { retryableAssertion } from '../utils/retryableAssertion.js'

test('executes the onAuthenticate callback', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onAuthenticate() {
        t.pass()
        resolve('done')
      },
    })

    newHocuspocusProvider(server, {
      token: 'SUPER-SECRET-TOKEN',
    })
  })
})

test('executes the onAuthenticate callback from a custom extension', async t => {
  await new Promise(async resolve => {
    class CustomExtension {
      async onAuthenticate() {
        t.pass()
        resolve('done')
      }
    }

    const server = await newHocuspocus({
      extensions: [
        new CustomExtension(),
      ],
    })

    newHocuspocusProvider(server, {
      token: 'SUPER-SECRET-TOKEN',
    })
  })
})

test('doesn’t execute the onAuthenticate callback when no token is passed to the provider', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onAuthenticate() {
        t.fail()
      },
    })

    newHocuspocusProvider(server, {
      onOpen() {
        setTimeout(() => {
          t.pass()
          resolve('done')
        }, 100)
      },
    })
  })
})

test('doesn’t send any message when no token is provided, but the onAuthenticate hook is configured', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onAuthenticate() {
        t.fail()
      },
    })

    server.enableDebugging()

    newHocuspocusProvider(server, {
      onOpen() {
        setTimeout(() => {
          t.deepEqual(server.getMessageLogs(), [])

          resolve('done')
        }, 100)
      },
    })
  })
})

test('confirms the `Token` message with an `Authenticated` message', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onAuthenticate() {
      // success
        return true
      },
    })
    server.enableDebugging()

    newHocuspocusProvider(server, {
      token: 'SUPER-SECRET-TOKEN',
      onAuthenticated() {
        t.deepEqual(server.getMessageLogs(), [
          { direction: 'in', type: 'Auth', category: 'Token' },
          { direction: 'out', type: 'Auth', category: 'Authenticated' },
          { direction: 'in', type: 'Sync', category: 'SyncStep1' },
          { direction: 'out', type: 'Sync', category: 'SyncStep2' },
          { direction: 'out', type: 'Sync', category: 'SyncStep1' },
          { direction: 'in', type: 'Awareness', category: 'Update' },
        ])

        resolve('done')
      },
    })
  })
})

test('replies with a `PermissionDenied` message when authentication fails', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onAuthenticate() {
        // fail
        throw Error()
      },
    })

    server.enableDebugging()

    newHocuspocusProvider(server, {
      token: 'SUPER-SECRET-TOKEN',
      onAuthenticationFailed() {
        t.deepEqual(server.getMessageLogs(), [
          { category: 'Token', direction: 'in', type: 'Auth' },
          { category: 'PermissionDenied', direction: 'out', type: 'Auth' },
        ])

        resolve('done')
      },
    })
  })
})

test('passes context from onAuthenticate to onLoadDocument', async t => {
  await new Promise(async resolve => {
    const mockContext = {
      user: 123,
    }

    const server = await newHocuspocus({
      async onAuthenticate() {
        return mockContext
      },
      async onLoadDocument({ context }: onLoadDocumentPayload) {
        t.deepEqual(context, mockContext)

        resolve('done')
      },
    })

    newHocuspocusProvider(server, {
      token: 'SUPER-SECRET-TOKEN',
    })
  })
})

test('ignores the authentication token when having no onAuthenticate hook', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus()

    newHocuspocusProvider(server, {
      token: 'SUPER-SECRET-TOKEN',
      onOpen() {
        t.pass()
        resolve('done')
      },
    })
  })
})

test('ignores the onAuthenticate hook when `authenticationRequired` is set to false', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onConnect({ connection }) {
        connection.requiresAuthentication = false
      },
      async onAuthenticate() {
        t.fail('NOPE')
      },
    })

    newHocuspocusProvider(server, {
      onSynced() {
        t.pass()
        resolve('done')
      },
    })
  })
})

test('has the authentication token', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onAuthenticate({ token }: onAuthenticatePayload) {
        t.is(token, 'SUPER-SECRET-TOKEN')

        resolve('done')
      },
    })

    newHocuspocusProvider(server, {
      token: 'SUPER-SECRET-TOKEN',
    })
  })
})

test('stops when the onAuthenticate hook throws an Error', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onAuthenticate() {
        throw new Error()
      },
      // MUST NOT BE CALLED
      async onLoadDocument() {
        t.fail('WARNING: When onAuthenticate fails onLoadDocument must not be called.')
      },
    })

    newHocuspocusProvider(server, {
      onClose() {
        t.pass()
        resolve('done')
      },
      token: 'SUPER-SECRET-TOKEN',
    })
  })
})

test('connects with the correct token', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onAuthenticate({ token }: onAuthenticatePayload) {
        if (token !== 'SUPER-SECRET-TOKEN') {
          throw new Error()
        }
      },
      async onLoadDocument() {
        t.pass()
        resolve('done')
      },
    })

    newHocuspocusProvider(server, {
      token: 'SUPER-SECRET-TOKEN',
    })
  })
})

test('onAuthenticate has access to document name', async t => {
  const docName = 'superSecretDoc'
  const requiredToken = 'SUPER-SECRET-TOKEN'

  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onAuthenticate({ token, documentName }: onAuthenticatePayload) {
        if (documentName !== docName) {
          throw new Error()
        }

        if (token !== requiredToken) {
          throw new Error()
        }
      },
    })

    newHocuspocusProvider(server, {
      token: requiredToken,
      name: docName,
      onAuthenticated() {
        t.pass()
        resolve('done')
      },
    })
  })
})

test('onAuthenticate wrong auth only disconnects affected doc (when multiplexing)', async t => {
  const docName = 'superSecretDoc'
  const requiredToken = 'SUPER-SECRET-TOKEN'

  const server = await newHocuspocus({
    async onAuthenticate({ token, documentName }: onAuthenticatePayload) {
      if (documentName !== docName) {
        throw new Error()
      }

      if (token !== requiredToken) {
        throw new Error()
      }
    },
  })

  const socket = newHocuspocusProviderWebsocket(server)

  const providerOK = newHocuspocusProvider(server, {
    websocketProvider: socket,
    token: requiredToken,
    name: docName,
    onAuthenticationFailed() {
      t.fail()
    },
  })

  const providerFail = newHocuspocusProvider(server, {
    websocketProvider: socket,
    token: 'wrongToken',
    name: 'otherDocu',
    onAuthenticated() {
      t.fail()
    },
  })

  await retryableAssertion(t, tt => {
    tt.is(providerOK.status, WebSocketStatus.Connected)
    tt.is(providerFail.status, WebSocketStatus.Disconnected)
    tt.is(server.getDocumentsCount(), 1)
    tt.is(server.getConnectionsCount(), 1)
  })

})
