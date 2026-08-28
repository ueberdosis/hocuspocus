import { describe, expect, test } from 'vite-plus/test'
import { pass } from '../utils/index.ts'

import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'

describe('onStateless', () => {
  test('executes the onStateless callback', async t => {
    const payloadToSend = 'STATELESS-MESSAGE'
    await new Promise(async resolve => {
      newHocuspocus({
        async onStateless({ payload }) {
          expect(payload).toBe(payloadToSend)
          pass()
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
})
