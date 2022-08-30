import test from 'ava'
import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils'

test('does not crash when invalid opcode is sent', async t => {
  await new Promise(resolve => {
    const mockContext = {
      user: 123,
    }

    const server = newHocuspocus()

    const provider = newHocuspocusProvider(server, {
      onSynced() {
        // Send a bad opcode via the low level internal _socket
        // Inspired by https://github.com/websockets/ws/blob/975382178f8a9355a5a564bb29cb1566889da9ba/test/websocket.test.js#L553-L589
        // @ts-ignore
        provider.webSocket?._socket.write(Buffer.from([0x00, 0x00])) // eslint-disable-line
      },
      onClose({ event }) {
        t.is(event.code, 1002)
        provider.destroy()
      },
      onDestroy() {
        t.pass()
        resolve(true)
      },
    })
  })
})
