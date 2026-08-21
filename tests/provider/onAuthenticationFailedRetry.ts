import { describe, expect, test } from 'vite-plus/test'

import {
  newHocuspocus,
  newHocuspocusProvider,
  newHocuspocusProviderWebsocket,
  sleep,
} from '../utils/index.ts'

describe('onAuthenticationFailedRetry', () => {
  test('provider retries auth with token function after initial failure', async t => {
    const docName = 'superSecretDoc'
    const requiredToken = 'SUPER-SECRET-TOKEN'

    const server = await newHocuspocus({
      async onAuthenticate({ token, documentName }) {
        if (documentName !== docName) {
          throw new Error()
        }

        if (token !== requiredToken) {
          throw new Error()
        }
      },
    })

    const socket = newHocuspocusProviderWebsocket(server)

    let tokenCallCount = 0

    const provider = newHocuspocusProvider(server, {
      websocketProvider: socket,
      name: docName,
      token: () => {
        tokenCallCount++
        return tokenCallCount === 1 ? 'wrongToken' : requiredToken
      },
      onAuthenticationFailed() {
        provider.sendToken()
        provider.startSync()
      },
    })

    await sleep(2000)

    expect(tokenCallCount).toBe(2)
    expect(provider.isAuthenticated).toBe(true)
  })

  test('second provider with same doc name succeeds after first fails auth', async t => {
    const docName = 'superSecretDoc'
    const requiredToken = 'SUPER-SECRET-TOKEN'

    const server = await newHocuspocus({
      async onAuthenticate({ token, documentName }) {
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
      name: docName,
      onAuthenticated() {
        expect.fail('providerFail should not authenticate')
      },
    })

    await sleep(1000)

    const providerOK = newHocuspocusProvider(server, {
      websocketProvider: socket,
      token: requiredToken,
      name: docName,
      onAuthenticationFailed() {
        expect.fail('providerOK should not fail auth')
      },
    })

    await sleep(1000)

    expect(providerFail.isAuthenticated).toBe(false)
    expect(providerOK.isAuthenticated).toBe(true)
  })
})
