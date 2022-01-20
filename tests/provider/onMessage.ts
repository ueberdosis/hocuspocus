import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils'

test('executes the onMessage callback', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({ })

    newHocuspocusProvider(server, {
      onMessage() {
        t.pass()
        resolve('done')
      },
    })
  })
})

test("executes the on('message') callback", async t => {
  await new Promise(resolve => {
    const server = newHocuspocus()

    const provider = newHocuspocusProvider(server)

    provider.on('message', () => {
      t.pass()
      resolve('done')
    })
  })
})
