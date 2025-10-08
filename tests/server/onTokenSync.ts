import test from 'ava'
import type { onAuthenticatePayload, onTokenSyncPayload } from '@hocuspocus/server'
import { WebSocketStatus } from '@hocuspocus/provider'
import {
  newHocuspocus, newHocuspocusProvider, newHocuspocusProviderWebsocket, sleep,
} from '../utils/index.ts'
import { retryableAssertion } from '../utils/retryableAssertion.ts'

// ============================================================================
// PROVIDER SEND TOKEN TESTS
// Provider calls sendToken() after onAuthenticated()
// ============================================================================

test('provider sendToken: onTokenSync receives correct token from provider after authentication', async t => {
  await new Promise(async resolve => {
    const expectedToken = 'UPDATED-TOKEN'

    const server = await newHocuspocus({
      async onAuthenticate() {
        return true // Allow initial auth
      },
      async onTokenSync({ token }: onTokenSyncPayload) {
        t.is(token, expectedToken)
        resolve('done')
      },
    })

    const provider = newHocuspocusProvider(server, {
      token: 'INITIAL-TOKEN', // Initial token for auth
      onAuthenticated() {
        // Update the provider's token before sending
        provider.configuration.token = expectedToken
        // Provider sends updated token after authentication
        provider.sendToken() // This will send the current token
      },
    })
  })
})

test('provider sendToken: executes onTokenSync from custom extension when provider sends token', async t => {
  await new Promise(async resolve => {
    class CustomExtension {
      async onAuthenticate() {
        return true
      }

      async onTokenSync({ token }: onTokenSyncPayload) {
        t.is(token, 'SUPER-SECRET-TOKEN')
        t.pass()
        resolve('done')
      }
    }

    const server = await newHocuspocus({
      extensions: [
        new CustomExtension(),
      ],
    })

    const provider = newHocuspocusProvider(server, {
      token: 'SUPER-SECRET-TOKEN',
      onAuthenticated() {
        provider.sendToken()
      },
    })
  })
})

test('provider sendToken: onTokenSync has access to full payload when provider sends token', async t => {
  const mockContext = { user: 123 }

  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onAuthenticate() {
        return mockContext
      },
      async onTokenSync({ context, connection, documentName, token }: onTokenSyncPayload) {
        t.deepEqual(context, mockContext)
        t.truthy(connection)
        t.is(documentName, 'hocuspocus-test')
        t.is(token, 'SUPER-SECRET-TOKEN')
        resolve('done')
      },
    })

    const provider = newHocuspocusProvider(server, {
      token: 'SUPER-SECRET-TOKEN',
      onAuthenticated() {
        provider.sendToken()
      },
    })
  })
})

test('provider sendToken: onTokenSync works with multiple providers sending tokens', async t => {
  const doc1 = 'document1'
  const doc2 = 'document2'
  const token1 = 'TOKEN-1'
  const token2 = 'TOKEN-2'
  let completedCount = 0

  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onAuthenticate() {
        return true // Allow initial auth
      },
      async onTokenSync({ documentName, token }: onTokenSyncPayload) {
        // Direct verification based on document name
        if (documentName === doc1) {
          t.is(token, token1)
        } else if (documentName === doc2) {
          t.is(token, token2)
        }

        completedCount++
        if (completedCount === 2) {
          resolve('done')
        }
      },
    })

    const socket = newHocuspocusProviderWebsocket(server)

    // Create two providers for different documents
    const provider1 = newHocuspocusProvider(server, {
      websocketProvider: socket,
      token: token1,
      name: doc1,
      onAuthenticated() {
        provider1.sendToken()
      },
    })

    const provider2 = newHocuspocusProvider(server, {
      websocketProvider: socket,
      token: token2,
      name: doc2,
      onAuthenticated() {
        provider2.sendToken()
      },
    })
  })
})

// ============================================================================
// SERVER REQUEST TOKEN TESTS
// Server calls connection.requestToken() after onAuthenticate() completes
// ============================================================================

test('server requestToken: executes onTokenSync when server requests token after authentication', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onAuthenticate() {
        return true
      },
      async onTokenSync({ token }: onTokenSyncPayload) {
        t.is(token, 'SUPER-SECRET-TOKEN')
        t.pass()
        resolve('done')
      },
    })

    const provider = newHocuspocusProvider(server, {
      token: 'SUPER-SECRET-TOKEN',
    })

    // Wait for provider to be authenticated to be able to find the connection
    await sleep(100)

    const document = server.documents.get('hocuspocus-test')
    if (document) {
      const connection = document.connections.values().next().value?.connection
      if (connection) {
        connection.requestToken()
      }
    }
  })
})

test('server requestToken: executes onTokenSync from custom extension when server requests token', async t => {
  await new Promise(async resolve => {
    class CustomExtension {
      async onAuthenticate() {
        return true
      }

      async onTokenSync({ token }: onTokenSyncPayload) {
        t.is(token, 'SUPER-SECRET-TOKEN')
        t.pass()
        resolve('done')
      }
    }

    const server = await newHocuspocus({
      extensions: [
        new CustomExtension(),
      ],
    })

    const provider = newHocuspocusProvider(server, {
      token: 'SUPER-SECRET-TOKEN',
    })

    await sleep(100)

    const document = server.documents.get('hocuspocus-test')
    if (document) {
      const connection = document.connections.values().next().value?.connection
      if (connection) {
        connection.requestToken()
      }
    }
  })
})

test('server requestToken: onTokenSync receives correct token when server requests it', async t => {
  await new Promise(async resolve => {
    const expectedToken = 'UPDATED-TOKEN'

    const server = await newHocuspocus({
      async onAuthenticate() {
        return true
      },
      async onTokenSync({ token }: onTokenSyncPayload) {
        t.is(token, expectedToken)
        resolve('done')
      },
    })

    const provider = newHocuspocusProvider(server, {
      token: 'INITIAL-TOKEN',
      onAuthenticated() {
        // Update the provider's token after connection
        provider.configuration.token = expectedToken
      },
    })

    await sleep(100)

    // Now trigger token sync request from server
    const document = server.documents.get('hocuspocus-test')
    if (document) {
      const connection = document.connections.values().next().value?.connection
      if (connection) {
        connection.requestToken()
      }
    }
  })
})

test('server requestToken: onTokenSync works with multiple documents when server requests tokens', async t => {
  const doc1 = 'document1'
  const doc2 = 'document2'
  const token1 = 'TOKEN-1'
  const token2 = 'TOKEN-2'
  let completedCount = 0

  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onAuthenticate() {
        return true // Allow initial auth
      },
      async onTokenSync({ documentName, token }: onTokenSyncPayload) {
        // Direct verification based on document name
        if (documentName === doc1) {
          t.is(token, token1)
        } else if (documentName === doc2) {
          t.is(token, token2)
        }

        completedCount++
        if (completedCount === 2) {
          resolve('done')
        }
      },
    })

    const socket = newHocuspocusProviderWebsocket(server)

    // Create two providers for different documents
    const provider1 = newHocuspocusProvider(server, {
      websocketProvider: socket,
      token: token1,
      name: doc1,
    })

    const provider2 = newHocuspocusProvider(server, {
      websocketProvider: socket,
      token: token2,
      name: doc2,
    })

    // Wait for both authentications to complete
    await sleep(100)

    // Now trigger token sync requests from server for both documents
    const doc1Connection = server.documents.get(doc1)?.connections.values().next().value?.connection
    const doc2Connection = server.documents.get(doc2)?.connections.values().next().value?.connection

    if (doc1Connection) doc1Connection.requestToken()
    if (doc2Connection) doc2Connection.requestToken()
  })
})

test('server requestToken: onTokenSync works with readonly connections when server requests token', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onAuthenticate({ connectionConfig }: onAuthenticatePayload) {
        connectionConfig.readOnly = true
        return true
      },
      async onTokenSync({ connection }: onTokenSyncPayload) {
        t.is(connection.readOnly, true)
        resolve('done')
      },
    })

    const provider = newHocuspocusProvider(server, {
      token: 'readonly-token',
    })

    // Wait for authentication to complete first
    await sleep(100)

    // Now trigger token sync request from server
    const document = server.documents.get('hocuspocus-test')
    if (document) {
      const connection = document.connections.values().next().value?.connection
      if (connection) {
        connection.requestToken()
      }
    }
  })
})

test('server requestToken: failure of onTokenSync should trigger onAuthenticationFailed hook on provider side', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onAuthenticate() {
        return true // Allow initial auth
      },
      async onTokenSync() {
        throw new Error('Token sync failed')
      },
    })

    const provider = newHocuspocusProvider(server, {
      token: 'SUPER-SECRET-TOKEN',
      onAuthenticationFailed() {
        t.pass()
        resolve('done')
      },
    })

    await sleep(100)

    const document = server.documents.get('hocuspocus-test')
    if (document) {
      const connection = document.connections.values().next().value?.connection
      if (connection) {
        connection.requestToken()
      }
    }
  })
})
