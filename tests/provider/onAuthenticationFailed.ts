import { describe, test } from 'vite-plus/test'
import { pass } from '../utils/index.ts'

import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'

describe('onAuthenticationFailed', () => {
  test('executes the onAuthenticationFailed callback', async t => {
    await new Promise(async resolve => {
      newHocuspocus({
        async onAuthenticate({ token }) {
          throw new Error()
        },
      }).then(server => {
        newHocuspocusProvider(server, {
          token: 'SUPER-SECRET-TOKEN',
          onAuthenticationFailed() {
            pass()
            resolve('done')
          },
        })
      })
    })
  })
})
