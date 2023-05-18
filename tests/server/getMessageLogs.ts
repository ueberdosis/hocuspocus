import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.js'

test('outputs the message log', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onAuthenticate() {
        return true
      },
    })

    server.enableDebugging()

    newHocuspocusProvider(server, {
      token: 'secret',
      onSynced() {
        t.true(server.getMessageLogs().length > 0)
        resolve('done')
      },
    })
  })
})
