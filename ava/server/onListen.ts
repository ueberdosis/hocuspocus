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
