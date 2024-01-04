import test from 'ava'
import { newHocuspocus } from '../utils/index.js'

test('returns a dynamic HTTP/WebSocket address with the correct port', async t => {
  const hocuspocus = await newHocuspocus({
    port: 4010,
  })

  t.is(hocuspocus.server!.address.port, 4010)
  t.is(hocuspocus.server!.httpURL, 'http://0.0.0.0:4010')
  t.is(hocuspocus.server!.webSocketURL, 'ws://0.0.0.0:4010')

  t.pass()
})
