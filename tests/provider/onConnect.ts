import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.js'

test('executes the onConnect callback', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus()

    newHocuspocusProvider(server, {
      onConnect() {
        t.pass()
        resolve('done')
      },
    })
  })
})

test("executes the on('connect') callback", async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus()

    const provider = newHocuspocusProvider(server)

    provider.on('connect', () => {
      t.pass()
      resolve('done')
    })
  })
})

test('resolves the connection attempt when onConnect throws an error', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
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
