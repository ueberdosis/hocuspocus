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

test('destroy works if no document is open', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus()

    await server.destroy()

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

test('destroy does not call onStoreDocument if nothing debounced', async t => {
  await new Promise(async resolve => {

    const server = await newHocuspocus({
      async onStoreDocument() {
        t.fail()
      },
    })

    const provider = newHocuspocusProvider(server)

    await retryableAssertion(t, t2 => t2.is(provider.synced, true))

    await server.destroy()

    resolve('')
  })
})

test('destroy does not call onStoreDocument after debounced onStoreDocument executes', async t => {
  await new Promise(async resolve => {
    let called = 0

    const server = await newHocuspocus({
      debounce: 200,
      unloadImmediately: true,
      async onStoreDocument() {
        called += 1
      },
    })

    const provider = newHocuspocusProvider(server, {
      onSynced() {
        // Dummy change to trigger onStoreDocument
        provider.document.getArray('foo').push(['foo'])
      },
    })

    await retryableAssertion(t, t2 => t2.is(provider.synced, true))

    // Wait for the debounced onStoreDocument to execute
    await new Promise(r => setTimeout(r, 400))

    await server.destroy()

    t.is(called, 1)

    resolve('')
  })
})

test('destroy calls onStoreDocument before returning if debounced', async t => {
  await new Promise(async resolve => {
    let called = false

    const server = await newHocuspocus({
      async onStoreDocument() {
        called = true
      },
    })

    const provider = newHocuspocusProvider(server, {
      onSynced() {
        // Dummy change to trigger onStoreDocument
        provider.document.getArray('foo').push(['foo'])
      },
    })

    await retryableAssertion(t, t2 => t2.is(provider.synced, true))

    t.is(called, false)
    await server.destroy()
    t.is(called, true)

    resolve('')
  })
})

test('destroy calls onStoreDocument before returning, even with unloadImmediately=false if debounced', async t => {
  await new Promise(async resolve => {
    let called = false

    const server = await newHocuspocus({
      async onStoreDocument() {
        called = true
      },
      unloadImmediately: false,
    })

    const provider = newHocuspocusProvider(server, {
      onSynced() {
        // Dummy change to trigger onStoreDocument
        provider.document.getArray('foo').push(['foo'])
      },
    })

    await retryableAssertion(t, t2 => t2.is(provider.synced, true))

    t.is(called, false)
    await server.destroy()
    t.is(called, true)

    resolve('')
  })
})

test('destroy calls onStoreDocument before returning, even with unloadImmediately=false, with multiple docs if debounced', async t => {
  await new Promise(async resolve => {
    let called = 0

    const server = await newHocuspocus({
      async onStoreDocument() {
        called += 1
      },
      unloadImmediately: false,
    })

    const provider1 = newHocuspocusProvider(server, {
      name: 'test1',
      onSynced() {
        // Dummy change to trigger onStoreDocument
        provider1.document.getArray('foo').push(['foo'])
      },
    })
    const provider2 = newHocuspocusProvider(server, {
      name: 'test2',
      onSynced() {
        // Dummy change to trigger onStoreDocument
        provider2.document.getArray('foo').push(['foo'])
      },
    })
    const provider3 = newHocuspocusProvider(server, {
      name: 'test3',
      onSynced() {
        // Dummy change to trigger onStoreDocument
        provider3.document.getArray('foo').push(['foo'])
      },
    })

    await retryableAssertion(t, t2 => t2.is(provider1.synced, true))
    await retryableAssertion(t, t2 => t2.is(provider2.synced, true))
    await retryableAssertion(t, t2 => t2.is(provider3.synced, true))

    t.is(called, 0)
    await server.destroy()
    t.is(called, 3)

    resolve('')
  })
})

test('destroy calls onStoreDocument before returning, with multiple docs if debounced', async t => {
  await new Promise(async resolve => {
    let called = 0

    const server = await newHocuspocus({
      async onStoreDocument() {
        called += 1
      },
      unloadImmediately: true,
    })

    const provider1 = newHocuspocusProvider(server, {
      name: 'test1',
      onSynced() {
        // Dummy change to trigger onStoreDocument
        provider1.document.getArray('foo').push(['foo'])
      },
    })
    const provider2 = newHocuspocusProvider(server, {
      name: 'test2',
      onSynced() {
        // Dummy change to trigger onStoreDocument
        provider2.document.getArray('foo').push(['foo'])
      },
    })
    const provider3 = newHocuspocusProvider(server, {
      name: 'test3',
      onSynced() {
        // Dummy change to trigger onStoreDocument
        provider3.document.getArray('foo').push(['foo'])
      },
    })

    await retryableAssertion(t, t2 => t2.is(provider1.synced, true))
    await retryableAssertion(t, t2 => t2.is(provider2.synced, true))
    await retryableAssertion(t, t2 => t2.is(provider3.synced, true))

    t.is(called, 0)
    await server.destroy()
    t.is(called, 3)

    resolve('')
  })
})
