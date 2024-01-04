import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.js'
import { retryableAssertion } from '../utils/retryableAssertion'

test('executes the onDestroy hook and has the instance', async t => {
  await new Promise(async resolve => {
    const hocuspocus = await newHocuspocus({
      async onDestroy({ instance }) {
        t.is(instance, hocuspocus)

        resolve('done')
      },
    })

    await hocuspocus.server!.destroy()
  })
})

test('destroy works if no document is open', async t => {
  await new Promise(async resolve => {
    const hocuspocus = await newHocuspocus()

    await hocuspocus.server!.destroy()

    t.pass()
    resolve('')
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

    const hocuspocus = await newHocuspocus({
      extensions: [
        new CustomExtension(),
      ],
    })

    await hocuspocus.server!.destroy()
  })
})

test('destroy closes all connections', async t => {
  await new Promise(async resolve => {
    const hocuspocus = await newHocuspocus()

    const provider1 = newHocuspocusProvider(hocuspocus)

    await retryableAssertion(t, t2 => t2.is(provider1.synced, true))

    t.is(hocuspocus.getConnectionsCount(), 1)
    t.is(hocuspocus.getDocumentsCount(), 1)

    await hocuspocus.server!.destroy()

    t.is(hocuspocus.getConnectionsCount(), 0)
    t.is(hocuspocus.getDocumentsCount(), 0)

    resolve('')
  })
})

test('destroy calls onStoreDocument before returning', async t => {
  await new Promise(async resolve => {
    let called = false

    const hocuspocus = await newHocuspocus({
      async onStoreDocument() {
        called = true
      },
    })

    const provider1 = newHocuspocusProvider(hocuspocus)

    await retryableAssertion(t, t2 => t2.is(provider1.synced, true))

    t.is(called, false)
    await hocuspocus.server!.destroy()
    t.is(called, true)

    resolve('')
  })
})

test('destroy calls onStoreDocument before returning, even with unloadImmediately=false', async t => {
  await new Promise(async resolve => {
    let called = false

    const hocuspocus = await newHocuspocus({
      async onStoreDocument() {
        called = true
      },
      unloadImmediately: false,
    })

    const provider1 = newHocuspocusProvider(hocuspocus)

    await retryableAssertion(t, t2 => t2.is(provider1.synced, true))

    t.is(called, false)
    await hocuspocus.server!.destroy()
    t.is(called, true)

    resolve('')
  })
})

test('destroy calls onStoreDocument before returning, even with unloadImmediately=false, with multiple docs', async t => {
  await new Promise(async resolve => {
    let called = 0

    const hocuspocus = await newHocuspocus({
      async onStoreDocument() {
        called += 1
      },
      unloadImmediately: false,
    })

    const provider1 = newHocuspocusProvider(hocuspocus, { name: 'test1' })
    const provider2 = newHocuspocusProvider(hocuspocus, { name: 'test2' })
    const provider3 = newHocuspocusProvider(hocuspocus, { name: 'test3' })

    await retryableAssertion(t, t2 => t2.is(provider1.synced, true))
    await retryableAssertion(t, t2 => t2.is(provider2.synced, true))
    await retryableAssertion(t, t2 => t2.is(provider3.synced, true))

    t.is(called, 0)
    await hocuspocus.server!.destroy()
    t.is(called, 3)

    resolve('')
  })
})

test('destroy calls onStoreDocument before returning, with multiple docs', async t => {
  await new Promise(async resolve => {
    let called = 0

    const hocuspocus = await newHocuspocus({
      async onStoreDocument() {
        called += 1
      },
      unloadImmediately: true,
    })

    const provider1 = newHocuspocusProvider(hocuspocus, { name: 'test1' })
    const provider2 = newHocuspocusProvider(hocuspocus, { name: 'test2' })
    const provider3 = newHocuspocusProvider(hocuspocus, { name: 'test3' })

    await retryableAssertion(t, t2 => t2.is(provider1.synced, true))
    await retryableAssertion(t, t2 => t2.is(provider2.synced, true))
    await retryableAssertion(t, t2 => t2.is(provider3.synced, true))

    t.is(called, 0)
    await hocuspocus.server!.destroy()
    t.is(called, 3)

    resolve('')
  })
})
