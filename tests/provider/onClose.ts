import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils'

test('onClose callback is executed', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus()

    const provider = newHocuspocusProvider(server, {
      onConnect() {
        provider.disconnect()
      },
      onClose() {
        t.pass()
        resolve('done')
      },
    })
  })
})

test("on('close') callback is executed", async t => {
  await new Promise(resolve => {
    const server = newHocuspocus()

    const provider = newHocuspocusProvider(server)

    provider.on('connect', () => {
      provider.disconnect()
    })

    provider.on('close', () => {
      t.pass()
      resolve('done')
    })
  })
})
