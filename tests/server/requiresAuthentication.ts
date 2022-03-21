import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils'

test('requires a token when the onAuthenticate hook is present', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      async onAuthenticate() {
        //
      },
    })

    t.is(server.requiresAuthentication, true)
    resolve('done')
  })
})

test('doesn’t require a token when the onAuthenticate hook isn’t present', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus()

    t.is(server.requiresAuthentication, false)
    resolve('done')
  })
})

test('requires a token when the onAuthenticate hook is present in a extension', async t => {
  await new Promise(resolve => {
    class CustomExtension {
      async onAuthenticate() {
      //
      }
    }

    const server = newHocuspocus({
      extensions: [
      // @ts-ignore
        new CustomExtension(),
      ],
    })

    t.is(server.requiresAuthentication, true)
    resolve('done')
  })
})
