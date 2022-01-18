import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils'

test('onConfigure callback is executed', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      async onConfigure({ instance }) {
        t.is(instance, server)

        resolve('done')
      },
    })
  })
})

test('executes onConfigure callback from an extension', async t => {
  await new Promise(resolve => {
    class CustomExtension {
      async onConfigure() {
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

test('has the configuration', async t => {
  await new Promise(resolve => {
    newHocuspocus({
      port: 1337,
      async onConfigure({ configuration }) {
        t.is(configuration.port, 1337)

        resolve('done')
      },
    })
  })
})
