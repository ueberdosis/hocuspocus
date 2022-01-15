import test from 'ava'
import { newHocuspocus } from '../utils'

test('executes the onListen callback', async t => {
  await new Promise(resolve => {
    newHocuspocus({
      async onListen() {
        t.pass()
        resolve('done')
      },
    })
  })
})

test('executes the onListen callback from an extension', async t => {
  await new Promise(resolve => {
    class CustomExtension {
      async onListen() {
        t.pass()
        resolve('done')
      }
    }

    newHocuspocus({
      extensions: [
        new CustomExtension(),
      ],
    })
  })
})
