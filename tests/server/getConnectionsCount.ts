import test from 'ava'
import { retryableAssertion } from '../utils/retryableAssertion.ts'
import { newHocuspocus, newHocuspocusProvider, newHocuspocusProviderWebsocket } from '../utils/index.ts'

test('returns 0 connections when there’s no one connected', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus()

    t.is(server.getConnectionsCount(), 0)

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
        t.is(server.getConnectionsCount(), 0)
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

test('total connections includes direct connections', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({ name: 'hocuspocus-test' })

    await server.openDirectConnection('hocuspocus-test')
    t.is(server.getConnectionsCount(), 1)

    newHocuspocusProvider(server, {
      onSynced() {
        t.is(server.getConnectionsCount(), 2)

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

  await retryableAssertion(t, tt => {
    tt.is(server.getConnectionsCount(), 5)
  })

  providers.forEach(provider => { provider.disconnect(); provider.configuration.websocketProvider.disconnect() })

  await retryableAssertion(t, tt => {
    tt.is(server.getConnectionsCount(), 0)
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

  await retryableAssertion(t, tt => {
    tt.is(server.getConnectionsCount(), 3)
  })

  providers.forEach(provider => { provider.disconnect(); provider.configuration.websocketProvider.disconnect() })

  await retryableAssertion(t, tt => {
    tt.is(server.getConnectionsCount(), 0)
  })
})
