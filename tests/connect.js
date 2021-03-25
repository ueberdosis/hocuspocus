/* eslint-disable */
import { expect } from 'chai'
import { Hocuspocus } from '../packages/server/src'
import { connectToServer, defaultPort } from './utils/utils'

context('connect', () => {
  let Server

  beforeEach(() => {
    Server = new Hocuspocus()
    Server.configuration.port = defaultPort
  })

  afterEach(async () => {
    await Server.destroy()
  })

  it('should be able to connect to the websocket server', (done) => {
    Server.configure({
      async onListen(data) {
       const { wsProvider } = connectToServer()

        wsProvider.on('status', async (event) => {
          if(event.status !== 'connected') return
          done()
        })
      }
    })

    Server.listen()
  })
})
