import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils'

test('executes the onConnect callback', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus()

    newHocuspocusProvider(server, {
      onConnect: () => {
        t.pass()
        resolve('done')
      },
    })
  })
})

test("executes the on('connect') callback", async t => {
  await new Promise(resolve => {
    const server = newHocuspocus()

    const provider = newHocuspocusProvider(server)
    provider.on('connect', () => {
      t.pass()
      resolve('done')
    })
  })
})

test.skip('doesn’t execute the onConnect callback when the server throws an error', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      async onConnect() {
        throw new Error()
      },
    })

    newHocuspocusProvider(server, {
      onConnect: () => {
        t.fail('onConnect must not be executed')
      },
      onClose: () => {
        t.pass()
        resolve('done')
      },
    })
  })
})
