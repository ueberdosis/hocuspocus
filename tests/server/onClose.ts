import test from 'ava'
import { WebSocketStatus } from '@hocuspocus/provider'
import { newHocuspocus, newHocuspocusProvider, newHocuspocusProviderWebsocket } from '../utils/index.js'
import { retryableAssertion } from '../utils/retryableAssertion.js'

test('server closes connection when receiving close event from provider', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({})
    const socket = newHocuspocusProviderWebsocket(server, {})

    const provider1 = newHocuspocusProvider(server, {
      websocketProvider: socket,
      name: 'hocuspocus-test',
    })

    await retryableAssertion(t, t2 => {
      t2.is(server.getConnectionsCount(), 1)
    })

    await retryableAssertion(t, t2 => {
      provider1.destroy()
      t2.is(server.getConnectionsCount(), 0)
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

    await retryableAssertion(t, t2 => {
      t2.is(server.getConnectionsCount(), 1)
    })

    socket.shouldConnect = false
    provider1.destroy()

    t.is(provider1.configuration.websocketProvider.status, WebSocketStatus.Connected)
    t.is(provider2.configuration.websocketProvider.status, WebSocketStatus.Connected)

    setTimeout(async () => {
      t.is(server.getConnectionsCount(), 1)
      provider2.destroy()

      t.is(provider1.configuration.websocketProvider.status, WebSocketStatus.Connected)
      t.is(provider2.configuration.websocketProvider.status, WebSocketStatus.Connected)

      await retryableAssertion(t, t2 => {
        t2.is(server.getConnectionsCount(), 1)
        t2.is(provider1.configuration.websocketProvider.status, WebSocketStatus.Connected)
        t2.is(provider2.configuration.websocketProvider.status, WebSocketStatus.Connected)
      })

      resolve('ok')
    }, 200)
  })
})
