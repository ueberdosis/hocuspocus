import * as Y from 'yjs'
import { describe, expect, test } from 'vite-plus/test'
import { pass } from '../utils/index.ts'

import { TiptapTransformer } from '@hocuspocus/transformer'
import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils/index.ts'

describe('openDirectConnection', () => {
  test('rejects empty document name via direct connection', async t => {
    const server = await newHocuspocus()

    await expect(server.openDirectConnection('')).rejects.toThrow('Document name must not be empty')

    expect(server.getDocumentsCount()).toBe(0)
  })

  test('rejects whitespace-only document name via direct connection', async t => {
    const server = await newHocuspocus()

    await expect(server.openDirectConnection('   ')).rejects.toThrow(
      'Document name must not be empty',
    )

    expect(server.getDocumentsCount()).toBe(0)
  })

  test('direct connection prevents document from being removed from memory', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus()

      await server.openDirectConnection('hocuspocus-test')

      const provider = newHocuspocusProvider(server, {
        onSynced() {
          provider.configuration.websocketProvider.destroy()
          provider.destroy()

          sleep(server.configuration.debounce + 50).then(() => {
            expect(server.getDocumentsCount()).toBe(1)
            resolve('done')
          })
        },
      })
    })
  })
  test('direct connection works even if provider is connected', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus()

      const provider = newHocuspocusProvider(server, {
        onSynced() {
          provider.document.getMap('config').set('a', 'valueFromProvider')
        },
      })

      await sleep(150)

      const directConnection = await server.openDirectConnection('hocuspocus-test')
      await directConnection.transact(doc => {
        expect('valueFromProvider').toBe(String(doc.getMap('config').get('a')))
        doc.getMap('config').set('b', 'valueFromServerDirectConnection')
      })

      await sleep(100)
      expect('valueFromServerDirectConnection').toBe(
        String(provider.document.getMap('config').get('b')),
      )

      resolve(1)
      pass()
    })
  })

  test('direct connection can apply yjsUpdate', async t => {
    const server = await newHocuspocus()
    const expectedContent = '<paragraph>Example Paragraph</paragraph>'
    let resolveProviderSynced!: () => void
    const providerSynced = new Promise<void>(resolve => {
      resolveProviderSynced = resolve
    })
    const provider = newHocuspocusProvider(server, {
      onSynced() {
        resolveProviderSynced()
      },
    })

    await providerSynced
    const fragment = provider.document.getXmlFragment('default')
    expect(fragment.toJSON()).toBe('')

    let resolveUpdateApplied!: () => void
    const updateApplied = new Promise<void>(resolve => {
      resolveUpdateApplied = resolve
    })
    const observer = () => {
      if (fragment.toJSON() === expectedContent) {
        fragment.unobserveDeep(observer)
        resolveUpdateApplied()
      }
    }
    fragment.observeDeep(observer)

    const directConnection = await server.openDirectConnection('hocuspocus-test')
    await directConnection.transact(doc => {
      Y.applyUpdate(
        doc,
        Y.encodeStateAsUpdate(
          TiptapTransformer.toYdoc({
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: 'Example Paragraph',
                  },
                ],
              },
            ],
          }),
        ),
      )
    })

    await updateApplied
    expect(fragment.toJSON()).toBe(expectedContent)
    await directConnection.disconnect()
  })

  test('direct connection can transact', async t => {
    const server = await newHocuspocus()

    const direct = await server.openDirectConnection('hocuspocus-test')

    await direct.transact(document => {
      document.getArray('test').insert(0, ['value'])
    })

    expect(direct.document?.getArray('test').toJSON()[0]).toBe('value')
  })

  test('direct connection cannot transact once closed', async t => {
    const server = await newHocuspocus()

    const direct = await server.openDirectConnection('hocuspocus-test')
    await direct.disconnect()

    try {
      await direct.transact(document => {
        document.getArray('test').insert(0, ['value'])
      })
      expect.fail('DirectConnection should throw an error when transacting on closed connection')
    } catch (err) {
      if (err instanceof Error && err.message === 'direct connection closed') {
        pass()
      } else {
        expect.fail('unknown error')
      }
    }
  })

  test('if a direct connection closes, the document should be unloaded if there is no other connection left', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus()

      const direct = await server.openDirectConnection('hocuspocus-test1')
      expect(server.getDocumentsCount()).toBe(1)
      expect(server.getConnectionsCount()).toBe(1)

      await direct.transact(document => {
        document.getArray('test').insert(0, ['value'])
      })

      await direct.disconnect()

      expect(server.getConnectionsCount()).toBe(0)
      expect(server.getDocumentsCount()).toBe(0)
      resolve('done')
    })
  })

  test('direct connection transact awaits until onStoreDocument has finished', async t => {
    let onStoreDocumentFinished = false

    await new Promise(async resolve => {
      const server = await newHocuspocus({
        onStoreDocument: async () => {
          onStoreDocumentFinished = false
          await sleep(200)
          onStoreDocumentFinished = true
        },
      })

      const direct = await server.openDirectConnection('hocuspocus-test2')
      expect(server.getDocumentsCount()).toBe(1)
      expect(server.getConnectionsCount()).toBe(1)

      expect(onStoreDocumentFinished).toBe(false)
      await direct.transact(document => {
        document.getArray('test').insert(0, ['value'])
      })

      await direct.disconnect()
      expect(onStoreDocumentFinished).toBe(true)

      expect(server.getConnectionsCount()).toBe(0)
      expect(server.getDocumentsCount()).toBe(0)
      expect(onStoreDocumentFinished).toBe(true)
      resolve('done')
    })
  })

  test('direct connection transact awaits until onStoreDocument has finished, even if unloadImmediately=false', async t => {
    let onStoreDocumentFinished = false
    let directConnDisconnecting = false
    let storedAfterDisconnect = false

    await new Promise(async resolve => {
      const server = await newHocuspocus({
        unloadImmediately: false,
        onStoreDocument: async () => {
          onStoreDocumentFinished = false
          await sleep(200)
          onStoreDocumentFinished = true

          if (directConnDisconnecting) {
            storedAfterDisconnect = true
          }
        },
        afterUnloadDocument: async data => {
          if (!storedAfterDisconnect) {
            expect.fail('this shouldnt be called')
          }
        },
      })

      const direct = await server.openDirectConnection('hocuspocus-test')
      expect(server.getDocumentsCount()).toBe(1)
      expect(server.getConnectionsCount()).toBe(1)

      expect(onStoreDocumentFinished).toBe(false)
      await direct.transact(document => {
        document.getArray('test').insert(0, ['value'])
      })

      const provider = newHocuspocusProvider(server)
      provider.document.getMap('aaa').set('bb', 'b')
      provider.disconnect()
      provider.configuration.websocketProvider.disconnect()

      await sleep(100)

      directConnDisconnecting = true
      await direct.disconnect()
      expect(onStoreDocumentFinished).toBe(true)

      expect(server.getConnectionsCount()).toBe(0)

      expect(storedAfterDisconnect).toBe(true)

      resolve('done')
    })
  })

  test('does not unload document if an earlierly started onStoreDocument is still running', async t => {
    let onStoreDocumentStarted = 0
    let onStoreDocumentFinished = 0

    const server = await newHocuspocus({
      unloadImmediately: false,
      debounce: 100,
      onStoreDocument: async () => {
        onStoreDocumentStarted++
        if (onStoreDocumentStarted === 1) {
          // Simulate a long running onStoreDocument for the first debounced save
          await sleep(500)
        }
        onStoreDocumentFinished++
      },
      afterUnloadDocument: async data => {},
    })

    // Trigger a change, which will start a debounced onStoreDocument after 100ms
    const provider = newHocuspocusProvider(server)
    provider.document.getMap('aaa').set('bb', 'b')

    await new Promise(async resolve => {
      provider.on('synced', resolve)

      if (!provider.unsyncedChanges) resolve('')
    })

    expect(server.getDocumentsCount()).toBe(1)
    expect(server.getConnectionsCount()).toBe(1)

    // Wait for the debounced onStoreDocument to start
    await sleep(110)
    expect(onStoreDocumentStarted).toBe(1)
    expect(onStoreDocumentFinished).toBe(0)

    // Open direct connection to prevent document from being unloaded
    const direct = await server.openDirectConnection('hocuspocus-test')
    expect(server.getDocumentsCount()).toBe(1)
    expect(server.getConnectionsCount()).toBe(2)

    // Close the websocket client
    provider.disconnect()
    provider.configuration.websocketProvider.disconnect()
    await sleep(50)
    expect(server.getDocumentsCount()).toBe(1)
    expect(server.getConnectionsCount()).toBe(1)
    expect(onStoreDocumentStarted).toBe(1)
    expect(onStoreDocumentFinished).toBe(0)

    direct.disconnect()
    await sleep(50)
    // Another save must not start before the first one has finished
    expect(onStoreDocumentStarted).toBe(1)
    expect(onStoreDocumentFinished).toBe(0)
    // Document must not be unloaded yet, because the first onStoreDocument is still running
    expect(server.getDocumentsCount()).toBe(1)
    expect(server.getConnectionsCount()).toBe(0)

    // Wait enough time to be sure the onStoreDocument has finished and ensure that the document was eventually unloaded
    await sleep(500)

    // The second onStoreDocument triggered by direct.disconnect must have started and finished now
    expect(onStoreDocumentStarted).toBe(2)
    expect(onStoreDocumentFinished).toBe(2)
    // The document must have been unloaded now as well
    expect(server.getDocumentsCount()).toBe(0)
  })

  test('creating a websocket connection after transact but before debounce interval doesnt create different docs', async t => {
    let onStoreDocumentFinished = false
    let disconnected = false
    let testDone = false

    await new Promise(async resolve => {
      const server = await newHocuspocus({
        onStoreDocument: async () => {
          onStoreDocumentFinished = false
          await sleep(200)
          onStoreDocumentFinished = true
        },
        async afterUnloadDocument(data) {
          if (disconnected && !testDone) {
            expect.fail('must not be called')
          }
        },
      })

      const direct = await server.openDirectConnection('hocuspocus-test')
      expect(server.getDocumentsCount()).toBe(1)
      expect(server.getConnectionsCount()).toBe(1)

      expect(onStoreDocumentFinished).toBe(false)
      await direct.transact(document => {
        document.transact(() => {
          document.getArray('test').insert(0, ['value'])
        }, 'testOrigin')
      })

      await direct.disconnect()
      expect(onStoreDocumentFinished).toBe(true)
      disconnected = true

      expect(server.getConnectionsCount()).toBe(0)
      expect(server.getDocumentsCount()).toBe(0)
      expect(onStoreDocumentFinished).toBe(true)

      const provider = newHocuspocusProvider(server)

      await sleep(server.configuration.debounce * 2)

      testDone = true
      resolve('done')
    })
  })

  test('direct connection passes context', async t => {
    return new Promise(async resolve => {
      const server = await newHocuspocus({
        async onChange(x) {
          expect(x.context.x).toBe(123)
          pass()
          resolve()
        },
      })

      const direct = await server.openDirectConnection('hocuspocus-test', {
        x: 123,
      })

      await direct.transact(document => {
        document.getArray('test').insert(0, ['value'])
      })

      expect(direct.document?.getArray('test').toJSON()[0]).toBe('value')
    })
  })

  test('disconnect({ unloadImmediately: false }) keeps the document warm and coalesces stores', async t => {
    let storeCount = 0

    const server = await newHocuspocus({
      debounce: 100,
      maxDebounce: 500,
      onStoreDocument: async () => {
        storeCount += 1
      },
    })

    const first = await server.openDirectConnection('hocuspocus-test')
    await first.transact(document => {
      document.getArray('test').insert(0, ['a'])
    })
    await first.disconnect({ unloadImmediately: false })

    // The document stays in memory and nothing is persisted yet.
    expect(server.getConnectionsCount()).toBe(0)
    expect(server.getDocumentsCount()).toBe(1)
    expect(storeCount).toBe(0)

    // A follow-up direct connection reuses the warm document.
    const second = await server.openDirectConnection('hocuspocus-test')
    expect(server.getDocumentsCount()).toBe(1)
    await second.transact(document => {
      document.getArray('test').insert(1, ['b'])
    })
    await second.disconnect({ unloadImmediately: false })

    expect(server.getDocumentsCount()).toBe(1)
    expect(storeCount).toBe(0)

    // After the debounce window the store flushes once (coalesced) and the
    // document is unloaded.
    await sleep(server.configuration.maxDebounce + server.configuration.debounce + 100)
    expect(storeCount).toBe(1)
    expect(server.getDocumentsCount()).toBe(0)
  })

  test('disconnect() without options still persists and unloads immediately', async t => {
    let storeCount = 0

    const server = await newHocuspocus({
      onStoreDocument: async () => {
        storeCount += 1
      },
    })

    const direct = await server.openDirectConnection('hocuspocus-test')
    await direct.transact(document => {
      document.getArray('test').insert(0, ['value'])
    })
    await direct.disconnect()

    expect(storeCount).toBe(1)
    expect(server.getConnectionsCount()).toBe(0)
    expect(server.getDocumentsCount()).toBe(0)
  })
})
