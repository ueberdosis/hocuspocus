import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'

test('executes the onMessage callback', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus(t, { })

    newHocuspocusProvider(t, server, {
      onMessage() {
        t.pass()
        resolve('done')
      },
    })
  })
})

test("executes the on('message') callback", async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus(t)

    const provider = newHocuspocusProvider(t, server)

    provider.on('message', () => {
      t.pass()
      resolve('done')
    })
  })
})
