import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils'

test('executes the onConnect callback', async t => {
  const server = await newHocuspocus()

  await new Promise(resolve => {
    newHocuspocusProvider(server, {
      onConnect: () => {
        resolve('done')
      },
    })
  })

  t.pass()
})

test("executes the on('connect') callback", async t => {
  const server = await newHocuspocus()
  const provider = newHocuspocusProvider(server)

  await new Promise(resolve => {
    provider.on('connect', () => {
      resolve('done')
    })
  })

  t.pass()
})

test.skip('doesn’t execute the onConnect callback when the server throws an error', async t => {
  const server = await newHocuspocus({
    async onConnect() {
      throw new Error()
    },
  })

  await new Promise(resolve => {
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
