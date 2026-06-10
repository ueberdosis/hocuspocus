import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'

test('calls the beforeBroadcastStateless hook', async t => {
  await new Promise(async resolve => {
    const payloadToSend = 'STATELESS-MESSAGE'
    const server = await newHocuspocus(t, {
      async beforeBroadcastStateless({ payload }) {
        t.is(payload, payloadToSend)
        t.pass()
        resolve('done')
      },
    })

    newHocuspocusProvider(t, server, {
      onSynced() {
        server.documents.get('hocuspocus-test')?.broadcastStateless(payloadToSend)
      },
    })
  })
})
