import test from 'ava'
import { WebSocketStatus } from '@hocuspocus/provider'
import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils'
import { retryableAssertion } from '../utils/retryableAssertion'

test('closes all connections', async t => {
  const server = newHocuspocus()

  const provider = newHocuspocusProvider(server, {
    name: 'hocuspocus-test',
    onClose() {
      // Make sure it doesn’t reconnect.
      provider.disconnect()
    },
  })

  const anotherProvider = newHocuspocusProvider(server, {
    name: 'hocuspocus-test-2',
    onClose() {
      // Make sure it doesn’t reconnect.
      anotherProvider.disconnect()
    },
  })

  await sleep(100)

  server.closeConnections()

  await retryableAssertion(t, tt => {
    tt.is(provider.status, WebSocketStatus.Disconnected)
    tt.is(anotherProvider.status, WebSocketStatus.Disconnected)
  })

})

test('closes a specific connection when a documentName is passed', async t => {
  const server = newHocuspocus()

  const provider = newHocuspocusProvider(server, {
    name: 'hocuspocus-test',
    onClose() {
      // Make sure it doesn’t reconnect.
      provider.disconnect()
    },
  })

  const anotherProvider = newHocuspocusProvider(server, {
    name: 'hocuspocus-test-2',
  })

  await sleep(100)

  server.closeConnections('hocuspocus-test')

  await retryableAssertion(t, tt => {
    tt.is(provider.status, WebSocketStatus.Disconnected)
    tt.is(anotherProvider.status, WebSocketStatus.Connected)
  })
})

test('uses a proper close event', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus()

    newHocuspocusProvider(server, {
      name: 'hocuspocus-test',
      onSynced() {
        server.closeConnections()
      },
      onClose({ event }) {
        // Make sure it doesn’t reconnect.
        t.is(event.code, 4205)
        t.is(event.reason, 'Reset Connection')

        resolve('done')
      },
    })
  })
})
