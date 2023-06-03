import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.js'

test('onOpen callback is executed', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus()

    newHocuspocusProvider(server, {
      onOpen() {
        t.pass()
        resolve('done')
      },
    })
  })
})

test("on('open') callback is executed", async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus()

    const provider = newHocuspocusProvider(server)

    provider.on('open', () => {
      t.pass()
      resolve('done')
    })
  })
})
