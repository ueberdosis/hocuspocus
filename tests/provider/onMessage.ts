import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.js'

test('executes the onMessage callback', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({ })

    newHocuspocusProvider(server, {
      onMessage() {
        t.pass()
        resolve('done')
      },
    })
  })
})

test("executes the on('message') callback", async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus()

    const provider = newHocuspocusProvider(server)

    provider.on('message', () => {
      t.pass()
      resolve('done')
    })
  })
})
