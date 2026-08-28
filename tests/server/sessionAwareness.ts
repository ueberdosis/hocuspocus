import { describe, expect, test } from 'vite-plus/test'
import { pass, throws } from '../utils/index.ts'

import { parseRoutingKey } from '@hocuspocus/common'
import type { onAuthenticatePayload, connectedPayload } from '@hocuspocus/server'
import { readVarString, createDecoder } from 'lib0/decoding'
import {
  newHocuspocus,
  newHocuspocusProvider,
  newHocuspocusProviderWebsocket,
} from '../utils/index.ts'
import { retryableAssertion } from '../utils/retryableAssertion.ts'

describe('sessionAwareness', () => {
  test('sessionAwareness: two providers with same doc name both connect successfully', async t => {
    await new Promise(async resolve => {
      let connectedCount = 0

      const server = await newHocuspocus({
        async onAuthenticate() {
          return true
        },
      })

      const socket = newHocuspocusProviderWebsocket(server)

      const provider1 = newHocuspocusProvider(server, {
        websocketProvider: socket,
        token: 'token-1',
        name: 'shared-doc',
        sessionAwareness: true,
        onAuthenticated() {
          connectedCount++
          if (connectedCount === 2) {
            resolve('done')
          }
        },
      })

      const provider2 = newHocuspocusProvider(server, {
        websocketProvider: socket,
        token: 'token-2',
        name: 'shared-doc',
        sessionAwareness: true,
        onAuthenticated() {
          connectedCount++
          if (connectedCount === 2) {
            resolve('done')
          }
        },
      })

      expect(provider1).toBeTruthy()
      expect(provider2).toBeTruthy()
    })
  })

  test('sessionAwareness: auth failure isolation - provider A fails, provider B succeeds', async t => {
    const server = await newHocuspocus({
      async onAuthenticate({ token }: onAuthenticatePayload) {
        if (token === 'bad-token') {
          throw new Error('unauthorized')
        }
        return true
      },
    })

    const socket = newHocuspocusProviderWebsocket(server)

    const providerFail = newHocuspocusProvider(server, {
      websocketProvider: socket,
      token: 'bad-token',
      name: 'shared-doc',
      sessionAwareness: true,
      onAuthenticated() {
        expect.fail('providerFail should not authenticate')
      },
    })

    const providerOK = newHocuspocusProvider(server, {
      websocketProvider: socket,
      token: 'good-token',
      name: 'shared-doc',
      sessionAwareness: true,
      onAuthenticationFailed() {
        expect.fail('providerOK should not fail auth')
      },
    })

    await retryableAssertion(() => {
      expect(providerFail.isAuthenticated).toBe(false)
      expect(providerOK.isAuthenticated).toBe(true)
      expect(server.getDocumentsCount()).toBe(1)
    })
  })

  test('sessionAwareness: false - two providers with same name on same socket throws when first is authenticated', async t => {
    const server = await newHocuspocus({
      async onAuthenticate() {
        return true
      },
    })

    const socket = newHocuspocusProviderWebsocket(server)

    const provider1 = newHocuspocusProvider(server, {
      websocketProvider: socket,
      token: 'token',
      name: 'same-doc',
      sessionAwareness: false,
    })

    await retryableAssertion(() => {
      expect(provider1.isAuthenticated).toBe(true)
    })

    // Now that provider1 is authenticated, attaching a second with the same name should throw
    expect(() => {
      newHocuspocusProvider(server, {
        websocketProvider: socket,
        token: 'token',
        name: 'same-doc',
        sessionAwareness: false,
      })
    }).toThrow()
  })

  test('sessionAwareness: connection has correct sessionId', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onAuthenticate() {
          return true
        },
        async connected({ connection }: connectedPayload) {
          expect(connection.sessionId).toBeTruthy()
          expect(typeof connection.sessionId).toBe('string')
          expect(connection.sessionId!.length > 0).toBeTruthy()
          resolve('done')
        },
      })

      const socket = newHocuspocusProviderWebsocket(server)

      newHocuspocusProvider(server, {
        websocketProvider: socket,
        token: 'test-token',
        name: 'session-doc',
        sessionAwareness: true,
      })
    })
  })

  test('sessionAwareness: connection has correct providerVersion', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onAuthenticate() {
          return true
        },
        async connected({ connection }: connectedPayload) {
          expect(typeof connection.providerVersion).toBe('string')
          expect(connection.providerVersion!.length > 0).toBeTruthy()
          resolve('done')
        },
      })

      const socket = newHocuspocusProviderWebsocket(server)

      newHocuspocusProvider(server, {
        websocketProvider: socket,
        token: 'test-token',
        name: 'session-doc',
        sessionAwareness: true,
      })
    })
  })

  test('sessionAwareness: all outgoing messages from provider include sessionId in routing key', async t => {
    const server = await newHocuspocus({
      async onAuthenticate() {
        return true
      },
    })

    const socket = newHocuspocusProviderWebsocket(server)

    const sentMessages: Uint8Array[] = []
    const originalSend = socket.webSocket!.send.bind(socket.webSocket!)

    const provider = newHocuspocusProvider(server, {
      websocketProvider: socket,
      token: 'test-token',
      name: 'session-doc',
      sessionAwareness: true,
    })

    await retryableAssertion(() => {
      expect(provider.isSynced).toBe(true)
    })

    // Monkey-patch send to capture outgoing messages
    socket.webSocket!.send = (data: any) => {
      if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
        sentMessages.push(new Uint8Array(data))
      }
      originalSend(data)
    }

    // Trigger a document update which causes the provider to send an UpdateMessage
    provider.document.getMap('test').set('key', 'value')

    await retryableAssertion(() => {
      expect(sentMessages.length > 0, 'should have captured outgoing messages').toBe(true)

      for (const msg of sentMessages) {
        const decoder = createDecoder(msg)
        const routingKey = readVarString(decoder)
        const { documentName, sessionId } = parseRoutingKey(routingKey)
        expect(
          documentName,
          `message routing key should contain correct document name, got: ${routingKey}`,
        ).toBe('session-doc')
        expect(
          sessionId,
          `every outgoing message should include a sessionId in the routing key, got: ${routingKey}`,
        ).toBeTruthy()
      }
    })
  })

  test('sessionAwareness: SyncStep2 reply includes sessionId in routing key', async t => {
    const server = await newHocuspocus({
      async onAuthenticate() {
        return true
      },
    })

    const socket = newHocuspocusProviderWebsocket(server)

    const provider = newHocuspocusProvider(server, {
      websocketProvider: socket,
      token: 'test-token',
      name: 'sync-reply-doc',
      sessionAwareness: true,
    })

    await retryableAssertion(() => {
      expect(provider.isSynced).toBe(true)
    })

    // Capture all outgoing messages
    const sentMessages: Uint8Array[] = []
    const originalSend = socket.webSocket!.send.bind(socket.webSocket!)
    socket.webSocket!.send = (data: any) => {
      if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
        sentMessages.push(new Uint8Array(data))
      }
      originalSend(data)
    }

    // Force a sync which triggers SyncStep1 -> server replies with SyncStep1 -> provider replies with SyncStep2
    provider.forceSync()

    await retryableAssertion(() => {
      // We expect at least the SyncStep1 from forceSync plus the SyncStep2 reply
      expect(
        sentMessages.length >= 2,
        `should have at least 2 messages, got ${sentMessages.length}`,
      ).toBe(true)

      for (const msg of sentMessages) {
        const decoder = createDecoder(msg)
        const routingKey = readVarString(decoder)
        const { sessionId } = parseRoutingKey(routingKey)
        expect(
          sessionId,
          `message should include sessionId, got routing key: ${routingKey}`,
        ).toBeTruthy()
      }
    })
  })

  test('sessionAwareness: providers with different doc names still work without sessionAwareness', async t => {
    await new Promise(async resolve => {
      let connectedCount = 0

      const server = await newHocuspocus({
        async onAuthenticate() {
          return true
        },
      })

      const socket = newHocuspocusProviderWebsocket(server)

      newHocuspocusProvider(server, {
        websocketProvider: socket,
        token: 'token-1',
        name: 'doc-1',
        onAuthenticated() {
          connectedCount++
          if (connectedCount === 2) {
            resolve('done')
          }
        },
      })

      newHocuspocusProvider(server, {
        websocketProvider: socket,
        token: 'token-2',
        name: 'doc-2',
        onAuthenticated() {
          connectedCount++
          if (connectedCount === 2) {
            resolve('done')
          }
        },
      })

      pass()
    })
  })
})
