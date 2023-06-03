import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.js'

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
