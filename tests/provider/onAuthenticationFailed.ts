import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils'

test('executes the onAuthenticationFailed callback', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      async onAuthenticate({ token }) {
        throw new Error()
      },
    })

    newHocuspocusProvider(server, {
      token: 'SUPER-SECRET-TOKEN',
      onAuthenticationFailed() {
        t.pass()
        resolve('done')
      },
    })
  })
})
