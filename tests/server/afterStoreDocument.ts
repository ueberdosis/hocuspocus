import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'

test('calls the afterStoreDocument hook', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus(t, {
      async afterStoreDocument() {
        t.pass()

        resolve('done')
      },
    })

    const provider = newHocuspocusProvider(t, server, {
      onSynced() {
        // Dummy change to trigger onStoreDocument
        provider.document.getArray('foo').push(['foo'])
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

    const server = await newHocuspocus(t, {
      extensions: [
        new CustomExtension(),
      ],
    })

    const provider = newHocuspocusProvider(t, server, {
      onSynced() {
        provider.document.getArray('foo').insert(0, ['bar'])
      },
    })
  })
})
