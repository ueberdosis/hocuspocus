/* eslint-disable */
import { expect } from 'chai'
import { Hocuspocus } from '../packages/server/src'
import { connectToServer, defaultPort, defaultHost } from './utils/utils'
import fetch from 'node-fetch'
import WebSocket from 'ws'

// handle unhandled rejections
process.on('unhandledRejection', message => {
  throw new Error(message)
})

context('connect', () => {
  it('should be able to connect to the websocket server', (done) => {
    const Server = new Hocuspocus()

    Server.configure({
      port: defaultPort,
      async onListen(data) {

        // http works…
        fetch(`http://${defaultHost}:${defaultPort}`)
          .then(result => console.log('fetch', result))

        // ws works…
        const ws = new WebSocket(`ws://${defaultHost}:${defaultPort}`)
        ws.on('open', () => console.log('connected'))

        // y u not working? 😡
        const { wsProvider } = connectToServer()
        wsProvider.on('status', async (event) => {
          if (event.status !== 'connected') return
          await Server.destroy()
          done()
        })
      }
    })

    Server.listen()
  })
})
