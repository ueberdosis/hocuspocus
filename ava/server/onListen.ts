import test from 'ava'
import { Hocuspocus } from '@hocuspocus/server'

test('executes the onListen callback', async t => {
  const result = new Promise(resolve => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async onListen() {
        resolve('listening')
      },
    }).listen()
  })

  t.is(await result, 'listening')
})
