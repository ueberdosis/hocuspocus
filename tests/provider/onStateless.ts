import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.js'

test('executes the onStateless callback', async t => {
  const payloadToSend = 'STATELESS-MESSAGE'
  await new Promise(async resolve => {
    newHocuspocus({
      async onStateless({ payload }) {
        t.is(payload, payloadToSend)
        t.pass()
        resolve('done')
      },
    }).then(server => {
      const provider = newHocuspocusProvider(server, {
        onSynced: () => {
          provider.sendStateless(payloadToSend)
        },
      })
    })
  })
})
