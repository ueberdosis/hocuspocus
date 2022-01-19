import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils'

test('executes the onUpgrade callback', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      async onUpgrade() {
        t.pass()
        resolve('done')
      },
    })

    newHocuspocusProvider(server)
  })
})

test('executes the onUpgrade callback from an extension', async t => {
  await new Promise(resolve => {
    class CustomExtension {
      async onUpgrade() {
        t.pass()
        resolve('done')
      }
    }

    const server = newHocuspocus({
      extensions: [
        new CustomExtension(),
      ],
    })

    newHocuspocusProvider(server)
  })
})

test('has the server instance', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({

      async onUpgrade({ instance }) {
        t.is(instance, server)
        resolve('done')
      },
    })

    newHocuspocusProvider(server)
  })
})
