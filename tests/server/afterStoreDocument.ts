import test from 'ava'
import { assertThrottledCallback, createPromiseWithResolve, createStorageQueueExtension } from 'tests/utils/storeDocument.js'
import { newHocuspocus, newHocuspocusProvider, newHocuspocusProviderWebsocket } from '../utils/index.js'

test('calls the afterStoreDocument hook', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async afterStoreDocument() {
        t.pass()

        resolve('done')
      },
    })

    const provider = newHocuspocusProvider(server, {
      onSynced() {
        provider.configuration.websocketProvider.destroy()
        provider.destroy()
      },
    })
  })
})

test('executes afterStoreDocument callback from a custom extension', async t => {
  await new Promise(async resolve => {
    class CustomExtension {
      async afterStoreDocument() {
        t.pass()

        resolve('done')
      }
    }

    const server = await newHocuspocus({
      extensions: [
        new CustomExtension(),
      ],
    })

    const provider = newHocuspocusProvider(server, {
      onSynced() {
        provider.document.getArray('foo').insert(0, ['bar'])
      },
    })
  })
})

test('executes afterStoreDocument individually for each storageQueue', async t => {
  let startTime = 0
  const [a1Promise, a1Resolve] = createPromiseWithResolve()
  const [a2Promise, a2Resolve] = createPromiseWithResolve()
  const [b1Promise, b1Resolve] = createPromiseWithResolve()
  const [b2Promise, b2Resolve] = createPromiseWithResolve()
  const [default1Promise, default1Resolve] = createPromiseWithResolve()
  const [default2Promise, default2Resolve] = createPromiseWithResolve()

  function assertAfterStoreDocumentThrottled(minTime: number, maxTime: number, resolve: () => void, extensionName = 'default') {
    assertThrottledCallback(t, startTime, minTime, maxTime, resolve, 'afterStoreDocument', extensionName)
  }

  function createAfterStoreDocumentExtension(extensionName: string, storageQueue: string, debounceMin: number, debounceMax: number, resolve: () => void) {
    return createStorageQueueExtension(
      extensionName,
      storageQueue,
      {
        async afterStoreDocument() {
          assertAfterStoreDocumentThrottled(debounceMin, debounceMax, resolve, extensionName)
        },
      },
    )
  }

  const extensions = [
    createAfterStoreDocumentExtension('a1', 'a', 0, 500, a1Resolve),
    createAfterStoreDocumentExtension('a2', 'a', 0, 500, a2Resolve),
    createAfterStoreDocumentExtension('b1', 'b', 500, 1000, b1Resolve),
    createAfterStoreDocumentExtension('b2', 'b', 500, 1000, b2Resolve),
    createAfterStoreDocumentExtension('default1', 'default1', 1000, 1500, default1Resolve),
  ]

  const server = await newHocuspocus({
    unloadImmediately: false,
    debounce: 1000,
    maxDebounce: 1500,
    async afterStoreDocument() {
      assertAfterStoreDocumentThrottled(1000, 1500, default2Resolve, 'default2')
    },
    extensions,
    storageQueues: {
      a: {
        debounce: 0,
        maxDebounce: 500,
      },
      b: {
        debounce: 500,
        maxDebounce: 100,
      },
    },
  })

  const socket = newHocuspocusProviderWebsocket(server)

  newHocuspocusProvider(server, {
    websocketProvider: socket,
    onSynced() {
      startTime = Date.now()
      socket.destroy()
    },
  })

  await Promise.all([a1Promise, a2Promise, b1Promise, b2Promise, default1Promise, default2Promise])
})
