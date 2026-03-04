import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'

test('onClose callback is executed', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus(t)

    const provider = newHocuspocusProvider(t, server, {
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
    const server = await newHocuspocus(t)

    const provider = newHocuspocusProvider(t, server)

    provider.on('connect', () => {
      provider.configuration.websocketProvider.disconnect()
    })

    provider.on('close', () => {
      t.pass()
      resolve('done')
    })
  })
})
