/* eslint-disable */
import { expect } from 'chai'
import fetch from 'node-fetch'
import { Hocuspocus } from '../packages/server/src'
import { defaultHost, defaultPort } from './utils/utils'

context('listen', () => {

  it('should start an instance', async () => {
    const Server = new Hocuspocus
    Server.configure({ port: defaultPort })

    await Server.listen()
    await Server.destroy()
  })

  it('should fire onListen after starting the server', (done) => {
    const Server = new Hocuspocus

    Server.configure({
      port: defaultPort,
      async onListen() {
        await Server.destroy()
        done()
      }
    })

    Server.listen()
  })

  it('should fire onDestroy after destroying the server', (done) => {
    const Server = new Hocuspocus

    Server.configure({
      port: defaultPort,
      async onDestroy() {
        done()
      }
    })

    Server.listen()
    Server.destroy()
  })

  it('should respond with OK', (done) => {
    const Server = new Hocuspocus

    Server.configure({
      port: defaultPort,
      async onListen() {
        const response = await fetch(`http://${defaultHost}:${defaultPort}`)
        expect(response.ok).to.equal(true)
        await Server.destroy()
        done()
      }
    })

    Server.listen()
  })

  it('should fire onRequest', (done) => {
    const Server = new Hocuspocus

    Server.configure({
      port: defaultPort,
      async onListen() {
        await fetch(`http://${defaultHost}:${defaultPort}`)
      },
      async onRequest() {
        await Server.destroy()
        done()
      }
    })

    Server.listen()
  })

})
