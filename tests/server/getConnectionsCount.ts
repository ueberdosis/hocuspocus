import test from 'ava'
import { WebSocketStatus } from '@hocuspocus/provider'
import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils'
import { retryableAssertion } from '../utils/retryableAssertion'

test('returns 0 connections when there’s no one connected', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus()

    t.is(server.getConnectionsCount(), 0)

    resolve('done')
  })
})

test('returns 0 connections when the connection attempt fails', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      async onConnect() {
        throw new Error()
      },
    })

    newHocuspocusProvider(server, {
      onClose() {
        t.is(server.getConnectionsCount(), 0)
        resolve('done')
      },
    })
  })
})

test('outputs the total connections', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus()

    newHocuspocusProvider(server, {
      onSynced() {
        t.is(server.getConnectionsCount(), 1)

        newHocuspocusProvider(server, {
          onSynced() {
            t.is(server.getConnectionsCount(), 2)

            resolve('done')
          },
        })
      },
    })
  })
})

test('adds and removes connections properly', async t => {
  const server = newHocuspocus()

  const providers = [
    newHocuspocusProvider(server),
    newHocuspocusProvider(server),
    newHocuspocusProvider(server),
    newHocuspocusProvider(server),
    newHocuspocusProvider(server),
  ]

  await retryableAssertion(t, tt => {
    tt.is(server.getConnectionsCount(), 5)
  })

  providers.forEach(provider => provider.disconnect())

  await retryableAssertion(t, tt => {
    tt.is(server.getConnectionsCount(), 0)
  })
})
