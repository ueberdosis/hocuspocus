import test from 'ava'
import { newHocuspocus } from '../utils/index.js'

test('requires a token when the onAuthenticate hook is present', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onAuthenticate() {
        //
      },
    })

    t.is(server.requiresAuthentication, true)
    resolve('done')
  })
})

test('doesn’t require a token when the onAuthenticate hook isn’t present', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus()

    t.is(server.requiresAuthentication, false)
    resolve('done')
  })
})

test('requires a token when the onAuthenticate hook is present in a extension', async t => {
  await new Promise(async resolve => {
    class CustomExtension {
      async onAuthenticate() {
      //
      }
    }

    const server = await newHocuspocus({
      extensions: [
      // @ts-ignore
        new CustomExtension(),
      ],
    })

    t.is(server.requiresAuthentication, true)
    resolve('done')
  })
})
