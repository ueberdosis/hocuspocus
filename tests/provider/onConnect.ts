import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils'

test('executes the onConnect callback', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus()

    newHocuspocusProvider(server, {
      onConnect() {
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

test('resolves the connection attempt when onConnect throws an error', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      async onConnect() {
        throw new Error()
      },
    })

    newHocuspocusProvider(server, {
      onConnect() {
        t.fail('must not be called when onConnect fails')
      },
      onClose() {
        t.pass()
        resolve('done')
      },
    })
  })
})
