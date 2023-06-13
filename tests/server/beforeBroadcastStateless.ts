import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.js'

test('calls the beforeBroadcastStateless hook', async t => {
  await new Promise(async resolve => {
    const payloadToSend = 'STATELESS-MESSAGE'
    const server = await newHocuspocus({
      async beforeBroadcastStateless({ payload }) {
        t.is(payload, payloadToSend)
        t.pass()
        resolve('done')
      },
    })

    newHocuspocusProvider(server, {
      onSynced() {
        server.documents.get('hocuspocus-test')?.broadcastStateless(payloadToSend)
      },
    })
  })
})
