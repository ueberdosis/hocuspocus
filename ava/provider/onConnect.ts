import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils'

test('executes the onConnect callback', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus()
    server.listen()

    newHocuspocusProvider(server, {
      onConnect: () => {
        resolve('done')
      },
    })
  })

  t.pass()
})

test("executes the on('connect') callback", async t => {
  await new Promise(resolve => {
    const server = newHocuspocus()
    server.listen()

    const provider = newHocuspocusProvider(server)
    provider.on('connect', () => {
      resolve('done')
    })
  })

  t.pass()
})

test.skip('doesn’t execute the onConnect callback when the server throws an error', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      async onConnect() {
        throw new Error()
      },
    })
    server.listen()

    newHocuspocusProvider(server, {
      onConnect: () => {
        t.fail('onConnect must not be executed')
      },
      onClose: () => {
        resolve('done')
      },
    })
  })

  t.pass()
})
