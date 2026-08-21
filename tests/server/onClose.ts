import { describe, expect, test } from 'vite-plus/test'

import { WebSocketStatus } from '@hocuspocus/provider'
import {
  newHocuspocus,
  newHocuspocusProvider,
  newHocuspocusProviderWebsocket,
} from '../utils/index.ts'
import { retryableAssertion } from '../utils/retryableAssertion.ts'

describe('onClose', () => {
  test('server closes connection when receiving close event from provider', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({})
      const socket = newHocuspocusProviderWebsocket(server, {})

      const provider1 = newHocuspocusProvider(server, {
        websocketProvider: socket,
        name: 'hocuspocus-test',
      })

      await retryableAssertion(() => {
        expect(server.getConnectionsCount()).toBe(1)
      })

      await retryableAssertion(() => {
        provider1.destroy()
        expect(server.getConnectionsCount()).toBe(0)
      })

      resolve('ok')
    })
  })

  test('server doesnt close connection after receiving close event from all connections', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({})
      const socket = newHocuspocusProviderWebsocket(server, {})

      const provider1 = newHocuspocusProvider(server, {
        websocketProvider: socket,
        name: 'hocuspocus-test',
      })

      const provider2 = newHocuspocusProvider(server, {
        websocketProvider: socket,
        name: 'hocuspocus-test2',
      })

      await retryableAssertion(() => {
        expect(server.getConnectionsCount()).toBe(1)
      })

      socket.shouldConnect = false
      provider1.destroy()

      expect(provider1.configuration.websocketProvider.status).toBe(WebSocketStatus.Connected)
      expect(provider2.configuration.websocketProvider.status).toBe(WebSocketStatus.Connected)

      setTimeout(async () => {
        expect(server.getConnectionsCount()).toBe(1)
        provider2.destroy()

        expect(provider1.configuration.websocketProvider.status).toBe(WebSocketStatus.Connected)
        expect(provider2.configuration.websocketProvider.status).toBe(WebSocketStatus.Connected)

        await retryableAssertion(() => {
          expect(server.getConnectionsCount()).toBe(1)
          expect(provider1.configuration.websocketProvider.status).toBe(WebSocketStatus.Connected)
          expect(provider2.configuration.websocketProvider.status).toBe(WebSocketStatus.Connected)
        })

        resolve('ok')
      }, 200)
    })
  })
})
