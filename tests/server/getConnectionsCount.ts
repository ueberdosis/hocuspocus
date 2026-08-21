import { describe, expect, test } from 'vite-plus/test'

import { retryableAssertion } from '../utils/retryableAssertion.ts'
import {
  newHocuspocus,
  newHocuspocusProvider,
  newHocuspocusProviderWebsocket,
} from '../utils/index.ts'

describe('getConnectionsCount', () => {
  test('returns 0 connections when there’s no one connected', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus()

      expect(server.getConnectionsCount()).toBe(0)

      resolve('done')
    })
  })

  test('close connection open when it fails', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onConnect() {
          throw new Error()
        },
      })

      newHocuspocusProvider(server, {
        onAuthenticationFailed() {
          expect(server.getConnectionsCount()).toBe(0)
          resolve('done')
        },
      })
    })
  })

  test('dont close connection open when it fails but socket is external', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onConnect() {
          throw new Error()
        },
      })

      newHocuspocusProvider(server, {
        onAuthenticationFailed() {
          expect(server.getConnectionsCount()).toBe(0)
          resolve('done')
        },
      })
    })
  })

  test('outputs the total connections', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus()

      newHocuspocusProvider(server, {
        onSynced() {
          expect(server.getConnectionsCount()).toBe(1)

          newHocuspocusProvider(server, {
            onSynced() {
              expect(server.getConnectionsCount()).toBe(2)

              resolve('done')
            },
          })
        },
      })
    })
  })

  test('total connections includes direct connections', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({ name: 'hocuspocus-test' })

      await server.openDirectConnection('hocuspocus-test')
      expect(server.getConnectionsCount()).toBe(1)

      newHocuspocusProvider(server, {
        onSynced() {
          expect(server.getConnectionsCount()).toBe(2)

          resolve('done')
        },
      })
    })
  })

  test('adds and removes connections properly', async t => {
    const server = await newHocuspocus()

    const providers = [
      newHocuspocusProvider(server),
      newHocuspocusProvider(server),
      newHocuspocusProvider(server),
      newHocuspocusProvider(server),
      newHocuspocusProvider(server),
    ]

    await retryableAssertion(() => {
      expect(server.getConnectionsCount()).toBe(5)
    })

    providers.forEach(provider => {
      provider.disconnect()
      provider.configuration.websocketProvider.disconnect()
    })

    await retryableAssertion(() => {
      expect(server.getConnectionsCount()).toBe(0)
    })
  })

  test('multiplexed connections counts properly', async t => {
    const server = await newHocuspocus()
    const socket = newHocuspocusProviderWebsocket(server)

    const providers = [
      newHocuspocusProvider(server, { name: 'mux-1' }, {}, socket),
      newHocuspocusProvider(server, { name: 'mux-2' }, {}, socket),
      newHocuspocusProvider(server, { name: 'mux-3' }, {}, socket),
      newHocuspocusProvider(server),
      newHocuspocusProvider(server),
    ]

    await retryableAssertion(() => {
      expect(server.getConnectionsCount()).toBe(3)
    })

    providers.forEach(provider => {
      provider.disconnect()
      provider.configuration.websocketProvider.disconnect()
    })

    await retryableAssertion(() => {
      expect(server.getConnectionsCount()).toBe(0)
    })
  })
})
