import test from 'ava'
import { Hocuspocus } from '@hocuspocus/server'

test('executes the onListen callback', async t => {
  await new Promise(resolve => {
    const server = new Hocuspocus()

    server.configure({
      quiet: true,
      port: 0,
      async onListen() {
        resolve('done')
      },
    }).listen()
  })

  t.pass()
})
