import test from 'ava'
import { onStoreDocumentPayload } from '@hocuspocus/server'
import { HocuspocusProvider } from '@hocuspocus/provider'
import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils'

test('calls the onStoreDocument hook before the document is removed from memory', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onStoreDocument() {
        t.pass()
        resolve('done')
      },
    })

    const provider = newHocuspocusProvider(server, {
      onSynced() {
        provider.destroy()
      },
    })
  })
})

test('doesn’t remove the document from memory when there’s a new connection established during onStoreDocument is called', async t => {
  await new Promise(async resolve => {
    let anotherProvider: HocuspocusProvider

    const server = await newHocuspocus({
      async onStoreDocument() {
        return sleep(1000)
      },
    })

    newHocuspocusProvider(server, {
      onSynced() {
        setTimeout(() => {
          anotherProvider.connect()
        }, 100)

        setTimeout(() => {
          t.is(server.getDocumentsCount(), 1)
          resolve('done')
        }, 1100)
      },
    })

    anotherProvider = newHocuspocusProvider(server, {
      connect: false,
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
        t.deepEqual(triggered, [
          'one',
          'two',
        ])

        resolve('done')
      },
    })

    const provider = newHocuspocusProvider(server, {
      onSynced() {
        provider.destroy()
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
        t.deepEqual(triggered, [
          'zero',
          'one',
          'two',
        ])

        resolve('done')
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
        provider.destroy()
      },
    })
  })
})
