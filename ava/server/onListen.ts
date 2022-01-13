import test from 'ava'
import { Hocuspocus } from '@hocuspocus/server'

test('executes the onListen callback', async t => {
  const server = new Promise(resolve => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async onListen() {
        resolve('listening')
      },
    }).listen()
  })

  t.is(await server, 'listening')
})
