import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'

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
