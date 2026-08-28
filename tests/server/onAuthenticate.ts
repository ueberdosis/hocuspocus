import { describe, expect, test } from 'vite-plus/test'
import { pass } from '../utils/index.ts'

import { WebSocketStatus } from '@hocuspocus/provider'
import type { onAuthenticatePayload, onLoadDocumentPayload } from '@hocuspocus/server'
import {
  newHocuspocus,
  newHocuspocusProvider,
  newHocuspocusProviderWebsocket,
  sleep,
} from '../utils/index.ts'
import { retryableAssertion } from '../utils/retryableAssertion.ts'

describe('onAuthenticate', () => {
  test('executes the onAuthenticate callback', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onAuthenticate() {
          pass()
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
          pass()
          resolve('done')
        }
      }

      const server = await newHocuspocus({
        extensions: [new CustomExtension()],
      })

      newHocuspocusProvider(server, {
        token: 'SUPER-SECRET-TOKEN',
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

      newHocuspocusProvider(server, {
        token: 'SUPER-SECRET-TOKEN',
        onAuthenticated() {
          pass()
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

      newHocuspocusProvider(server, {
        token: 'SUPER-SECRET-TOKEN',
        onAuthenticationFailed() {
          pass()
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
          expect(context).toStrictEqual(mockContext)

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
          pass()
          resolve('done')
        },
      })
    })
  })

  test('has the authentication token', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onAuthenticate({ token }: onAuthenticatePayload) {
          expect(token).toBe('SUPER-SECRET-TOKEN')

          resolve('done')
        },
      })

      newHocuspocusProvider(server, {
        token: 'SUPER-SECRET-TOKEN',
      })
    })
  })

  test('does not disconnect provider when the onAuthenticate hook throws an Error', async t => {
    const server = await newHocuspocus({
      async onAuthenticate() {
        throw new Error()
      },
      // MUST NOT BE CALLED
      async onLoadDocument() {
        expect.fail('WARNING: When onAuthenticate fails onLoadDocument must not be called.')
      },
    })

    const provider = newHocuspocusProvider(server, {
      onClose() {
        expect.fail()
      },
      token: 'SUPER-SECRET-TOKEN',
    })

    await retryableAssertion(() => {
      expect(provider.configuration.websocketProvider.status).toBe(WebSocketStatus.Connected)
      expect(server.getDocumentsCount()).toBe(0)
      expect(server.getConnectionsCount()).toBe(0)
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
          pass()
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
          pass()
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

    const providerFail = newHocuspocusProvider(server, {
      websocketProvider: socket,
      token: 'wrongToken',
      name: 'otherDocu',
      onAuthenticated() {
        expect.fail()
      },
    })

    await sleep(100)

    const providerOK = newHocuspocusProvider(server, {
      websocketProvider: socket,
      token: requiredToken,
      name: docName,
      onAuthenticationFailed() {
        expect.fail()
      },
    })

    await retryableAssertion(() => {
      expect(socket.status).toBe(WebSocketStatus.Connected)
      expect(server.getDocumentsCount()).toBe(1)
      expect(server.getConnectionsCount()).toBe(1)
    })
  })

  test('onAuthenticate readonly auth only affects 1 doc (when multiplexing)', async t => {
    const server = await newHocuspocus({
      async onAuthenticate({ token, documentName, connectionConfig }: onAuthenticatePayload) {
        if (token === 'readonly') {
          connectionConfig.readOnly = true
        }
      },
    })

    const socket = newHocuspocusProviderWebsocket(server)

    const providerReadOnly = newHocuspocusProvider(server, {
      websocketProvider: socket,
      token: 'readonly',
      name: 'doc1',
      onAuthenticationFailed() {
        expect.fail()
      },
    })

    const providerOK = newHocuspocusProvider(server, {
      websocketProvider: socket,
      token: 'read+write',
      name: 'doc2',
      onAuthenticationFailed() {
        expect.fail()
      },
    })

    await retryableAssertion(() => {
      expect(socket.status).toBe(WebSocketStatus.Connected)
      expect(socket.status).toBe(WebSocketStatus.Connected)
      expect(server.getDocumentsCount()).toBe(2)
      expect(server.getConnectionsCount()).toBe(1)
      expect(socket.status).toBe(WebSocketStatus.Connected)
    })

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(server.documents.get('doc1')!.connections.keys().next().value!.readOnly).toBe(true)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(server.documents.get('doc2')!.connections.keys().next().value!.readOnly).toBe(false)
  })

  test('onAuthenticate is called even if no token is provided', async t => {
    const docName = 'superSecretDoc'

    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onAuthenticate({ documentName }: onAuthenticatePayload) {
          pass()
          resolve('done')
        },
      })

      newHocuspocusProvider(server, {
        name: docName,
      })
    })
  })
})
