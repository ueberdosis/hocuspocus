import test from 'ava'
import { newHocuspocus } from '../utils'

test('executes the onListen callback', async t => {
  await new Promise(resolve => {
    newHocuspocus({
      async onListen() {
        resolve('done')
      },
    })
  })

  t.pass()
})

test('executes the onListen callback from an extension', async t => {
  await new Promise(resolve => {
    class CustomExtension {
      async onListen() {
        resolve('done')
      }
    }

    newHocuspocus({
      extensions: [
        new CustomExtension(),
      ],
    })
  })

  t.pass()
})
