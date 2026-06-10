import test from 'ava'
import { retryableAssertion } from '../utils/retryableAssertion.ts'
import { newHocuspocus, newHocuspocusProvider, newHocuspocusProviderWebsocket } from '../utils/index.ts'

test('returns 0 connections when there’s no one connected', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus(t)

    t.is(server.getConnectionsCount(), 0)

    resolve('done')
  })
})

test('close connection open when it fails', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus(t, {
      async onConnect() {
        throw new Error()
      },
    })

    newHocuspocusProvider(t, server, {
      onAuthenticationFailed() {
        t.is(server.getConnectionsCount(), 0)
        resolve('done')
      },
    })
  })
})

test('dont close connection open when it fails but socket is external', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus(t, {
      async onConnect() {
        throw new Error()
      },
    })

    newHocuspocusProvider(t, server, {
      onAuthenticationFailed() {
        t.is(server.getConnectionsCount(), 0)
        resolve('done')
      },
    })
  })
})

test('outputs the total connections', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus(t)

    newHocuspocusProvider(t, server, {
      onSynced() {
        t.is(server.getConnectionsCount(), 1)

        newHocuspocusProvider(t, server, {
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
    const server = await newHocuspocus(t, { name: 'hocuspocus-test' })

    await server.openDirectConnection('hocuspocus-test')
    t.is(server.getConnectionsCount(), 1)

    newHocuspocusProvider(t, server, {
      onSynced() {
        t.is(server.getConnectionsCount(), 2)

        resolve('done')
      },
    })
  })
})

test('adds and removes connections properly', async t => {
  const server = await newHocuspocus(t)

  const providers = [
    newHocuspocusProvider(t, server),
    newHocuspocusProvider(t, server),
    newHocuspocusProvider(t, server),
    newHocuspocusProvider(t, server),
    newHocuspocusProvider(t, server),
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
  const server = await newHocuspocus(t)
  const socket = newHocuspocusProviderWebsocket(t, server)

  const providers = [
    newHocuspocusProvider(t, server, { name: 'mux-1' }, {}, socket),
    newHocuspocusProvider(t, server, { name: 'mux-2' }, {}, socket),
    newHocuspocusProvider(t, server, { name: 'mux-3' }, {}, socket),
    newHocuspocusProvider(t, server),
    newHocuspocusProvider(t, server),

  ]

  await retryableAssertion(t, tt => {
    tt.is(server.getConnectionsCount(), 3)
  })

  providers.forEach(provider => { provider.disconnect(); provider.configuration.websocketProvider.disconnect() })

  await retryableAssertion(t, tt => {
    tt.is(server.getConnectionsCount(), 0)
  })
})
