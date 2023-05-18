import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.js'

test('onDisconnect callback is executed', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus()

    const provider = newHocuspocusProvider(server, {
      onConnect() {
        provider.configuration.websocketProvider.disconnect()
        provider.disconnect()
      },
      onDisconnect() {
        t.pass()
        resolve('done')
      },
    })
  })
})

test("on('disconnect') callback is executed", async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus()

    const provider = newHocuspocusProvider(server)

    provider.on('connect', () => {
      provider.configuration.websocketProvider.disconnect()
      provider.disconnect()
    })
    provider.on('disconnect', () => {
      t.pass()
      resolve('done')
    })
  })
})
