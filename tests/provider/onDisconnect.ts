import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils'

test('onDisconnect callback is executed', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus()

    const provider = newHocuspocusProvider(server, {
      onConnect() {
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
      provider.disconnect()
    })
    provider.on('disconnect', () => {
      t.pass()
      resolve('done')
    })
  })
})
