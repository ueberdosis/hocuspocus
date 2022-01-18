import test from 'ava'
import { newHocuspocus } from '../utils'

test('executes the onDestroy hook and has the instance', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      async onDestroy({ instance }) {
        t.is(instance, server)

        resolve('done')
      },
    })

    server.destroy()
  })
})

test('executes the onDestroy hook from a custom extension', async t => {
  await new Promise(resolve => {
    class CustomExtension {
      async onDestroy() {
        t.pass()

        resolve('done')
      }
    }

    const server = newHocuspocus({
      extensions: [
        new CustomExtension(),
      ],
    })

    server.destroy()
  })
})
