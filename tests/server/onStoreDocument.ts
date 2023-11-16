import test from 'ava'
import { onStoreDocumentPayload } from '@hocuspocus/server'
import { assertThrottledCallback, createPromiseWithResolve, createStorageQueueExtension } from 'tests/utils/storeDocument.js'
import {
  newHocuspocus, newHocuspocusProvider, newHocuspocusProviderWebsocket, sleep,
} from '../utils/index.js'

test('calls the onStoreDocument hook before the document is removed from memory', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onStoreDocument() {
        t.pass()
        resolve('done')
      },
    })

    const socket = newHocuspocusProviderWebsocket(server)

    const provider = newHocuspocusProvider(server, {
      websocketProvider: socket,
      onSynced() {
        socket.destroy()
      },
    })
  })
})

test('doesn’t remove the document from memory when there’s a new connection established during onStoreDocument is called', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onStoreDocument() {
        return sleep(1000)
      },
    })
    const socket = newHocuspocusProviderWebsocket(server)
    const anotherSocket = newHocuspocusProviderWebsocket(server, {
      connect: false,
    })

    newHocuspocusProvider(server, {
      websocketProvider: socket,
      onSynced() {
        setTimeout(() => {
          anotherSocket.connect()
        }, 100)

        setTimeout(() => {
          t.is(server.getDocumentsCount(), 1)
          resolve('done')
        }, 1100)
      },
    })
    newHocuspocusProvider(server, {
      websocketProvider: anotherSocket,
    })
  })
})

test('removes the document from memory when there’s no connection after onStoreDocument is called', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onStoreDocument() {
        return sleep(1000)
      },
    })

    const provider = newHocuspocusProvider(server, {
      onSynced() {
        provider.configuration.websocketProvider.destroy()
        provider.destroy()
      },
      onDestroy() {
        // Check if the document is removed from memory …
        setTimeout(() => {
          t.is(server.getDocumentsCount(), 0)

          resolve('done')
        }, 1100)
      },
    })
  })
})

test('onStoreDocument callback receives document updates', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onStoreDocument({ document }: onStoreDocumentPayload) {
        const value = document.getArray('foo').get(0)
        t.is(value, 'bar')

        resolve('done')
      },
    })

    const provider = newHocuspocusProvider(server)

    provider.on('synced', () => {
      provider.document.getArray('foo').insert(0, ['bar'])
    })
  })
})

test('debounces document changes for onStoreDocument hooks', async t => {
  await new Promise(async resolve => {
    let executedOnChange = 0
    let executedOnStoreDocument = 0

    const server = await newHocuspocus({
      debounce: 10,
      async onChange() {
        executedOnChange += 1
      },
      async onStoreDocument() {
        executedOnStoreDocument += 1
      },
      async onDestroy() {
        t.is(executedOnChange, 5)
        t.is(executedOnStoreDocument, 1)

        resolve('done')
      },
    })

    const provider = newHocuspocusProvider(server, {
      onSynced() {
        provider.document.getArray('foo').push(['foo'])
        provider.document.getArray('foo').push(['bar'])
        provider.document.getArray('foo').push(['barfoo'])
        provider.document.getArray('foo').push(['foobar'])
        provider.document.getArray('foo').push(['foofoo'])

        setTimeout(() => {
          server.destroy()
        }, 200)
      },
    })
  })
})

test('executes onStoreDocument callback from an extension', async t => {
  await new Promise(async resolve => {

    class CustomExtension {
      async onStoreDocument({ document }: onStoreDocumentPayload) {
        const value = document.getArray('foo').get(0)
        t.is(value, 'bar')

        resolve('done')
      }
    }

    const server = await newHocuspocus({
      extensions: [
        new CustomExtension(),
      ],
    })

    const provider = newHocuspocusProvider(server)

    provider.on('synced', () => {
      provider.document.getArray('foo').insert(0, ['bar'])
    })
  })
})

test('stops when one of the onStoreDocument hooks throws an error', async t => {
  await new Promise(async resolve => {
    class BreakingTheChain {
      async onStoreDocument() {
        setTimeout(() => {
          t.pass()
          resolve('done')
        }, 100)

        // Stop it!
        throw new Error()
      }
    }

    class NotExecuted {
      async onStoreDocument() {
      // This MUST NOT be executed.

        resolve('done')
      }
    }

    const server = await newHocuspocus({
      extensions: [
        new BreakingTheChain(),
        new NotExecuted(),
      ],
    })

    const provider = newHocuspocusProvider(server)

    provider.on('synced', () => {
      provider.document.getArray('foo').insert(0, ['bar'])
    })
  })
})

test('has the server instance', async t => {
  await new Promise(async resolve => {

    const server = await newHocuspocus({
      async onStoreDocument({ instance }) {
        t.is(instance, server)

        resolve('done')
      },
    })

    const provider = newHocuspocusProvider(server)

    provider.on('synced', () => {
      provider.document.getArray('foo').insert(0, ['bar'])
    })
  })
})

test('runs hooks in the given order', async t => {
  await new Promise(async resolve => {
    const triggered: string[] = []

    class Running {
      async onStoreDocument() {
        triggered.push('one')
      }
    }

    class BreakTheChain {
      async onStoreDocument() {
        triggered.push('two')
        throw Error()
      }
    }

    class NotRunning {
      async onStoreDocument() {
        triggered.push('three')
      }
    }

    const server = await newHocuspocus({
      extensions: [
        new Running(),
        new BreakTheChain(),
        new NotRunning(),
      ],
      // lowest priority
      async onStoreDocument() {
        triggered.push('four')
      },
      async afterStoreDocument() {
        t.fail() // this shouldnt run
      },
    })

    const provider = newHocuspocusProvider(server, {
      onSynced() {
        provider.configuration.websocketProvider.destroy()
        provider.destroy()

        setTimeout(() => {
          t.deepEqual(triggered, [
            'one',
            'two',
          ])

          resolve(true)
        }, 250)
      },
    })
  })
})

test('allows to overwrite the order of extension with a priority', async t => {
  await new Promise(async resolve => {
    const triggered: string[] = []

    class Running {
      async onStoreDocument() {
        triggered.push('one')
      }
    }

    class BreakTheChain {
      async onStoreDocument() {
        triggered.push('two')
        throw Error()
      }
    }

    class NotRunning {
      async onStoreDocument() {
        triggered.push('three')
      }
    }

    class HighPriority {
      priority = 1000

      async onStoreDocument() {
        triggered.push('zero')
      }
    }

    const server = await newHocuspocus({
      afterStoreDocument: async () => {
        t.fail()
      },
      extensions: [
        new Running(),
        new BreakTheChain(),
        new NotRunning(),
        new HighPriority(),
      ],
    })

    const provider = newHocuspocusProvider(server, {
      onSynced() {
        provider.configuration.websocketProvider.destroy()
        provider.destroy()

        setTimeout(() => {
          t.deepEqual(triggered, [
            'zero',
            'one',
            'two',
          ])

          resolve(true)
        }, 250)
      },
    })
  })
})

test('if a connection connects while another disconnects onStoreDocument is still running, onLoadDocument will be called after onStoreDocument finished', async t => {

  await new Promise(async testResolve => {
    let isStoredOnDb = false
    let loadCalls = 0

    const server = await newHocuspocus({
      async onStoreDocument({ instance }) {
        return new Promise(resolve => {
          setTimeout(() => {
            isStoredOnDb = true
            resolve(true)
          }, 200)
        })
      },
      async onLoadDocument() {
        return new Promise(resolve => {
          if (loadCalls > 0) {
            t.true(isStoredOnDb)
            testResolve(true)
          }

          loadCalls += 1
          resolve(true)

        })
      },
    })

    const provider = newHocuspocusProvider(server)
    provider.on('synced', () => {
      provider.configuration.websocketProvider.disconnect()

      setTimeout(() => {
        const provider2 = newHocuspocusProvider(server)

        provider2.on('synced', () => {
          provider2.configuration.websocketProvider.disconnect()
          testResolve(true)
          t.pass()
        })

      }, 50)
    })
  })

})

test('waits before calling onStoreDocument after the last user disconnects when configured', async t => {
  await new Promise(async resolve => {
    let startTime = 0
    const server = await newHocuspocus({
      unloadImmediately: false,
      debounce: 500,
      async onStoreDocument() {
        const endTime = Date.now()
        if (startTime === 0) {
          t.fail('startTime not set')
        } else if (endTime - startTime < 500) {
          t.fail('did not wait 500ms to call onStoreDocument when closing')
        } else {
          t.pass()
        }
        resolve('done')
      },
    })

    const socket = newHocuspocusProviderWebsocket(server)

    const provider = newHocuspocusProvider(server, {
      websocketProvider: socket,
      onSynced() {
        startTime = Date.now()
        socket.destroy()
      },
    })
  })
})

test('storageQueues throttle individually of each other', async t => {
  let startTime = 0
  const [a1Promise, a1Resolve] = createPromiseWithResolve()
  const [a2Promise, a2Resolve] = createPromiseWithResolve()
  const [b1Promise, b1Resolve] = createPromiseWithResolve()
  const [b2Promise, b2Resolve] = createPromiseWithResolve()
  const [default1Promise, default1Resolve] = createPromiseWithResolve()
  const [default2Promise, default2Resolve] = createPromiseWithResolve()

  function assertOnStoreDocumentThrottled(minTime: number, maxTime: number, resolve: () => void, extensionName = 'default') {
    assertThrottledCallback(t, startTime, minTime, maxTime, resolve, 'onStoreDocument', extensionName)
  }

  function createOnStoreDocumentExtension(extensionName: string, storageQueue: string, debounceMin: number, debounceMax: number, resolve: () => void) {
    return createStorageQueueExtension(
      extensionName,
      storageQueue,
      {
        async onStoreDocument() {
          assertOnStoreDocumentThrottled(debounceMin, debounceMax, resolve, extensionName)
        },
      },
    )
  }

  const extensions = [
    createOnStoreDocumentExtension('a1', 'a', 0, 500, a1Resolve),
    createOnStoreDocumentExtension('a2', 'a', 0, 500, a2Resolve),
    createOnStoreDocumentExtension('b1', 'b', 500, 1000, b1Resolve),
    createOnStoreDocumentExtension('b2', 'b', 500, 1000, b2Resolve),
    createOnStoreDocumentExtension('default1', 'default1', 1000, 1500, default1Resolve),
  ]

  const server = await newHocuspocus({
    unloadImmediately: false,
    debounce: 1000,
    maxDebounce: 1500,
    async onStoreDocument() {
      assertOnStoreDocumentThrottled(1000, 1500, default2Resolve, 'default2')
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
