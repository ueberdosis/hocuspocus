import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.js'

test('onClose callback is executed', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus()

    const provider = newHocuspocusProvider(server, {
      onConnect() {
        provider.configuration.websocketProvider.disconnect()
      },
      onClose() {
        t.pass()
        resolve('done')
      },
    })
  })
})

test("on('close') callback is executed", async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus()

    const provider = newHocuspocusProvider(server)

    provider.on('connect', () => {
      provider.configuration.websocketProvider.disconnect()
    })

    provider.on('close', () => {
      t.pass()
      resolve('done')
    })
  })
})
