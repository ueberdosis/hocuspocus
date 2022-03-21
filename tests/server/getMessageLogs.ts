import test from 'ava'
import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils'

test('outputs the message log', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      async onAuthenticate() {
        return true
      },
    })

    server.enableDebugging()

    const client = newHocuspocusProvider(server, {
      token: 'secret',
      onSynced() {
        t.true(server.getMessageLogs().length > 0)

        resolve('done')
      },
    })
  })
})
