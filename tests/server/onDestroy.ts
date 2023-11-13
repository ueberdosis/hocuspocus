import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.js'
import { retryableAssertion } from '../utils/retryableAssertion'

test('executes the onDestroy hook and has the instance', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onDestroy({ instance }) {
        t.is(instance, server)

        resolve('done')
      },
    })

    await server.destroy()
  })
})

test('executes the onDestroy hook from a custom extension', async t => {
  await new Promise(async resolve => {
    class CustomExtension {
      async onDestroy() {
        t.pass()

        resolve('done')
      }
    }

    const server = await newHocuspocus({
      extensions: [
        new CustomExtension(),
      ],
    })

    await server.destroy()
  })
})

test('destroy closes all connections', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus()

    const provider1 = newHocuspocusProvider(server)

    await retryableAssertion(t, t2 => t2.is(provider1.synced, true))

    t.is(server.getConnectionsCount(), 1)
    t.is(server.getDocumentsCount(), 1)

    await server.destroy()

    t.is(server.getConnectionsCount(), 0)
    t.is(server.getDocumentsCount(), 0)

    resolve('')
  })
})

test('destroy calls onStoreDocument before returning', async t => {
  await new Promise(async resolve => {
    let called = false

    const server = await newHocuspocus({
      async onStoreDocument() {
        called = true
      },
    })

    const provider1 = newHocuspocusProvider(server)

    await retryableAssertion(t, t2 => t2.is(provider1.synced, true))

    t.is(called, false)
    await server.destroy()
    t.is(called, true)

    resolve('')
  })
})


test('destroy calls onStoreDocument before returning, even with unloadImmediately=false', async t => {
  await new Promise(async resolve => {
    let called = false

    const server = await newHocuspocus({
      async onStoreDocument() {
        called = true
      },
      unloadImmediately: false,
    })

    const provider1 = newHocuspocusProvider(server)

    await retryableAssertion(t, t2 => t2.is(provider1.synced, true))

    t.is(called, false)
    await server.destroy()
    t.is(called, true)

    resolve('')
  })
})
