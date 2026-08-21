import { describe, expect, test } from 'vite-plus/test'
import { pass } from '../utils/index.ts'

import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'

describe('beforeBroadcastStateless', () => {
  test('calls the beforeBroadcastStateless hook', async t => {
    await new Promise(async resolve => {
      const payloadToSend = 'STATELESS-MESSAGE'
      const server = await newHocuspocus({
        async beforeBroadcastStateless({ payload }) {
          expect(payload).toBe(payloadToSend)
          pass()
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
})
