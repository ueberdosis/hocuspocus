import test from 'ava'
import { newHocuspocus } from '../utils/index.js'

test('executes the onDestroy hook and has the instance', async t => {
  await new Promise(async resolve => {
    const hocuspocus = await newHocuspocus({
      async onDestroy({ instance }) {
        t.is(instance, hocuspocus)

        resolve('done')
      },
    })

    hocuspocus.server!.destroy()
  })
})

test('executes the onDestroy hook from a custom extension', async t => {
  await new Promise(async resolve => {
    class CustomExtension {
      async onDestroy() {
        t.pass()

        resolve('done')
      }
    }

    const hocuspocus = await newHocuspocus({
      extensions: [
        new CustomExtension(),
      ],
    })

    hocuspocus.server!.destroy()
  })
})
