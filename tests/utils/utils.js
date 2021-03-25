/* eslint-disable */
import * as Y from 'yjs'
import nodeWindowPolyfill from 'node-window-polyfill'
import pkg from 'y-websocket'
import ws from 'ws'

const { WebsocketProvider } = pkg
nodeWindowPolyfill.register(false)

// handle unhandled rejections
// process.on('unhandledRejection', message => {
//   throw new Error(message)
// })

/*
 * Default values
 */
export const defaultHost = 'localhost'
export const defaultPort = parseInt(process.env.DEFAULT_PORT || 1234)
export const defaultRoomName = 'test'

/*
 * Methods
 */
export function connectToServer() {
  const doc = new Y.Doc()

  const wsProvider = new WebsocketProvider(
    `ws://${defaultHost}:${defaultPort}`,
    defaultRoomName,
    doc,
    { WebSocketPolyfill: ws },
  )

  return {
    wsProvider,
    doc
  }
}
