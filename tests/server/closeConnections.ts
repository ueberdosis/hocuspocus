import { describe, expect, test } from 'vite-plus/test'

import { WebSocketStatus } from '@hocuspocus/provider'
import {
  newHocuspocus,
  newHocuspocusProvider,
  newHocuspocusProviderWebsocket,
  sleep,
} from '../utils/index.ts'
import { retryableAssertion } from '../utils/retryableAssertion.ts'

// test('closes all connections', async t => {
//   const server = await newHocuspocus()
//   const socket = newHocuspocusProviderWebsocket(server)
//   const socket2 = newHocuspocusProviderWebsocket(server)

//   const provider = newHocuspocusProvider(server, {
//     name: 'hocuspocus-test',
//     onClose() {
//       // Make sure it doesn’t reconnect.
//       socket.disconnect()
//     },
//     websocketProvider: socket,
//   })

//   const anotherProvider = newHocuspocusProvider(server, {
//     name: 'hocuspocus-test-2',
//     onClose() {
//       // Make sure it doesn’t reconnect.
//       socket2.disconnect()
//     },
//     websocketProvider: socket2,
//   })

//   await sleep(100)

//   server.closeConnections()

//   expect(server.documents.size).toBe(1)
// })

describe('closeConnections', () => {
  test('closes a specific connection when a documentName is passed', async t => {
    const server = await newHocuspocus()
    const socket = newHocuspocusProviderWebsocket(server)
    const socket2 = newHocuspocusProviderWebsocket(server)

    const provider = newHocuspocusProvider(server, {
      name: 'hocuspocus-test',
      onClose() {
        // Make sure it doesn’t reconnect.
        socket.disconnect()
      },
      websocketProvider: socket,
    })

    const anotherProvider = newHocuspocusProvider(server, {
      name: 'hocuspocus-test-2',
      websocketProvider: socket2,
    })

    await sleep(100)

    server.closeConnections('hocuspocus-test')

    await retryableAssertion(() => {
      expect(socket.status).toBe(WebSocketStatus.Disconnected)
      expect(socket2.status).toBe(WebSocketStatus.Connected)
    })
  })

  // test('uses a proper close event', async t => {
  //   await new Promise(async resolve => {
  //     const server = await newHocuspocus()

  //     newHocuspocusProvider(server, {
  //       name: 'hocuspocus-test',
  //       onSynced() {
  //         server.closeConnections()
  //       },
  //       onClose({ event }) {
  //         // Make sure it doesn’t reconnect.
  //         expect(event.code).toBe(1000)
  //         expect(event.reason).toBe('Reset Connection')

  //         resolve('done')
  //       },
  //     })
  //   })
  // })
})
