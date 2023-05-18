import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.js'

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
          t.pass()
          resolve('done')
        },
      })
    })
  })
})
