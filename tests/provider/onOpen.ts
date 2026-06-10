import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'

test('onOpen callback is executed', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus(t)

    newHocuspocusProvider(t, server, {
      onOpen() {
        t.pass()
        resolve('done')
      },
    })
  })
})

test("on('open') callback is executed", async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus(t)

    const provider = newHocuspocusProvider(t, server)

    provider.on('open', () => {
      t.pass()
      resolve('done')
    })
  })
})
