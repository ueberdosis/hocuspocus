import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils'

test('calls the afterStoreDocument hook', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      async afterStoreDocument() {
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

test('executes afterStoreDocument callback from a custom extension', async t => {
  await new Promise(resolve => {
    class CustomExtension {
      async afterStoreDocument() {
        t.pass()

        resolve('done')
      }
    }

    const server = newHocuspocus({
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
