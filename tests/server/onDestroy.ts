import { describe, expect, test } from 'vite-plus/test'
import { pass } from '../utils/index.ts'

import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'
import { retryableAssertion } from '../utils/retryableAssertion.ts'

describe('onDestroy', () => {
  test('executes the onDestroy hook and has the instance', async t => {
    await new Promise(async resolve => {
      const hocuspocus = await newHocuspocus({
        async onDestroy({ instance }) {
          expect(instance).toBe(hocuspocus)

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

      pass()
      resolve('')
    })
  })

  test('executes the onDestroy hook from a custom extension', async t => {
    await new Promise(async resolve => {
      class CustomExtension {
        async onDestroy() {
          pass()

          resolve('done')
        }
      }

      const hocuspocus = await newHocuspocus({
        extensions: [new CustomExtension()],
      })

      await hocuspocus.server!.destroy()
    })
  })

  test('destroy closes all connections', async t => {
    await new Promise(async resolve => {
      const hocuspocus = await newHocuspocus()

      const provider1 = newHocuspocusProvider(hocuspocus)

      await retryableAssertion(() => expect(provider1.synced).toBe(true))

      expect(hocuspocus.getConnectionsCount()).toBe(1)
      expect(hocuspocus.getDocumentsCount()).toBe(1)

      await hocuspocus.server!.destroy()

      expect(hocuspocus.getConnectionsCount()).toBe(0)
      expect(hocuspocus.getDocumentsCount()).toBe(0)

      resolve('')
    })
  })

  test('destroy does not call onStoreDocument if nothing debounced', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onStoreDocument() {
          expect.fail()
        },
      })

      const provider = newHocuspocusProvider(server)

      await retryableAssertion(() => expect(provider.synced).toBe(true))

      await server.server!.destroy()

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

      await retryableAssertion(() => expect(provider.synced).toBe(true))

      // Wait for the debounced onStoreDocument to execute
      await new Promise(r => setTimeout(r, 400))

      await server.server!.destroy()

      expect(called).toBe(1)

      resolve('')
    })
  })

  test('destroy calls onStoreDocument before returning if debounced', async t => {
    await new Promise(async resolve => {
      let called = false

      const hocuspocus = await newHocuspocus({
        async onStoreDocument() {
          called = true
        },
      })

      const provider = newHocuspocusProvider(hocuspocus, {
        onSynced() {
          // Dummy change to trigger onStoreDocument
          provider.document.getArray('foo').push(['foo'])
        },
      })

      const provider1 = newHocuspocusProvider(hocuspocus)

      await retryableAssertion(() => expect(provider1.synced).toBe(true))

      expect(called).toBe(false)
      await hocuspocus.server!.destroy()
      expect(called).toBe(true)

      resolve('')
    })
  })

  test('destroy calls onStoreDocument before returning, even with unloadImmediately=false if debounced', async t => {
    await new Promise(async resolve => {
      let called = false

      const hocuspocus = await newHocuspocus({
        async onStoreDocument() {
          called = true
        },
        unloadImmediately: false,
      })

      const provider = newHocuspocusProvider(hocuspocus, {
        onSynced() {
          // Dummy change to trigger onStoreDocument
          provider.document.getArray('foo').push(['foo'])
        },
      })

      const provider1 = newHocuspocusProvider(hocuspocus)

      await retryableAssertion(() => expect(provider1.synced).toBe(true))
      await retryableAssertion(() => expect(provider.synced).toBe(true))

      expect(called).toBe(false)
      await hocuspocus.server!.destroy()
      expect(called).toBe(true)

      resolve('')
    })
  })

  test('destroy calls onStoreDocument before returning, even with unloadImmediately=false, with multiple docs if debounced', async t => {
    await new Promise(async resolve => {
      let called = 0

      const hocuspocus = await newHocuspocus({
        async onStoreDocument() {
          called += 1
        },
        unloadImmediately: false,
      })

      const provider1 = newHocuspocusProvider(hocuspocus, {
        name: 'test1',
        onSynced() {
          provider1.document.getArray('foo').push(['foo'])
        },
      })
      const provider2 = newHocuspocusProvider(hocuspocus, {
        name: 'test2',
        onSynced() {
          provider2.document.getArray('foo').push(['foo'])
        },
      })
      const provider3 = newHocuspocusProvider(hocuspocus, {
        name: 'test3',
        onSynced() {
          provider3.document.getArray('foo').push(['foo'])
        },
      })

      await retryableAssertion(() => expect(provider1.synced).toBe(true))
      await retryableAssertion(() => expect(provider2.synced).toBe(true))
      await retryableAssertion(() => expect(provider3.synced).toBe(true))

      // Wait for all changes to reach the server and trigger debounced stores
      await retryableAssertion(() => {
        expect(hocuspocus.debouncer.isDebounced('onStoreDocument-test1')).toBe(true)
        expect(hocuspocus.debouncer.isDebounced('onStoreDocument-test2')).toBe(true)
        expect(hocuspocus.debouncer.isDebounced('onStoreDocument-test3')).toBe(true)
      })

      expect(called).toBe(0)
      await hocuspocus.server!.destroy()
      await retryableAssertion(() => expect(called).toBe(3))

      resolve('')
    })
  })

  test('destroy calls onStoreDocument before returning, with multiple docs if debounced', async t => {
    await new Promise(async resolve => {
      let called = 0

      const hocuspocus = await newHocuspocus({
        async onStoreDocument() {
          called += 1
        },
        unloadImmediately: true,
      })

      const provider1 = newHocuspocusProvider(hocuspocus, {
        name: 'test1',
        onSynced() {
          provider1.document.getArray('foo').push(['foo'])
        },
      })
      const provider2 = newHocuspocusProvider(hocuspocus, {
        name: 'test2',
        onSynced() {
          provider2.document.getArray('foo').push(['foo'])
        },
      })
      const provider3 = newHocuspocusProvider(hocuspocus, {
        name: 'test3',
        onSynced() {
          provider3.document.getArray('foo').push(['foo'])
        },
      })

      await retryableAssertion(() => expect(provider1.synced).toBe(true))
      await retryableAssertion(() => expect(provider2.synced).toBe(true))
      await retryableAssertion(() => expect(provider3.synced).toBe(true))

      // Wait for all changes to reach the server and trigger debounced stores
      await retryableAssertion(() => {
        expect(hocuspocus.debouncer.isDebounced('onStoreDocument-test1')).toBe(true)
        expect(hocuspocus.debouncer.isDebounced('onStoreDocument-test2')).toBe(true)
        expect(hocuspocus.debouncer.isDebounced('onStoreDocument-test3')).toBe(true)
      })

      expect(called).toBe(0)
      await hocuspocus.server!.destroy()

      await retryableAssertion(() => expect(called).toBe(3))

      resolve('')
    })
  })
})
