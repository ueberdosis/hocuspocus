import test from 'ava'
import { retryableAssertion } from '../utils/retryableAssertion'
import { newHocuspocus, newHocuspocusProvider } from '../utils'

test('returns 0 connections when there’s no one connected', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus()

    t.is(server.getConnectionsCount(), 0)

    resolve('done')
  })
})

test('returns 0 connections when the connection attempt fails', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
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
  await new Promise(async resolve => {
    const server = await newHocuspocus()

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
  const server = await newHocuspocus()

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

  providers.forEach(provider => { provider.disconnect(); provider.configuration.websocketProvider.disconnect() })

  await retryableAssertion(t, tt => {
    tt.is(server.getConnectionsCount(), 0)
  })
})
