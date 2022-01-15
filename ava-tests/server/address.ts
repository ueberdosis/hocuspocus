import test from 'ava'
import { newHocuspocus } from '../utils'

test('returns a dynamic HTTP/WebSocket address with the correct port', async t => {
  const server = await newHocuspocus({
    port: 4010,
  })

  t.is(server.address.port, 4010)
  t.is(server.httpURL, 'http://127.0.0.1:4010')
  t.is(server.webSocketURL, 'ws://127.0.0.1:4010')

  t.pass()
})
