import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils'

test('onOpen callback is executed', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus()

    newHocuspocusProvider(server, {
      onOpen() {
        t.pass()
        resolve('done')
      },
    })
  })
})

test("on('open') callback is executed", async t => {
  await new Promise(resolve => {
    const server = newHocuspocus()

    const provider = newHocuspocusProvider(server)

    provider.on('open', () => {
      t.pass()
      resolve('done')
    })
  })
})
