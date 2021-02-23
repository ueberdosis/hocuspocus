/* eslint-disable */
import { expect } from 'chai'
import fetch from 'node-fetch'
import { Hocuspocus } from '../packages/server/src'

const defaultPort = parseInt(process.env.DEFAULT_PORT || 1234)

context('.listen()', () => {
  // const originalConsoleLog = console.log
  // let output
  //
  // beforeEach(() => {
  //   output = []
  //
  //   console.log = msg => {
  //     output.push(msg)
  //   }
  // })
  //
  // afterEach(function () {
  //   console.log = originalConsoleLog
  //
  //   if (this.currentTest.state === 'failed') {
  //     console.log(output.join('\n'))
  //   }
  // })

  it('should start an instance', (done) => {
    const Server = new Hocuspocus

    Server.configure({ port: defaultPort })
    Server.listen()
    Server.destroy()

    done()
  })

  it('should fire onListen after starting the server', (done) => {
    const Server = new Hocuspocus

    Server.configure({
      port: defaultPort,
      onListen() {
        done()
        Server.destroy()
      }
    })

    Server.listen()
  })

  it('should fire onDestroy after destroying the server', (done) => {
    const Server = new Hocuspocus

    Server.configure({
      port: defaultPort,
      onDestroy() {
        done()
      }
    })

    Server.listen()
    Server.destroy()
  })

  it('should respond with OK', async () => {
    const Server = new Hocuspocus

    Server.configure({
      port: defaultPort,
      async onListen(data, resolve) {

        const response = await fetch(`http://localhost:${defaultPort}`)
        console.log(response)

        expect(response.ok).to.equal(true)
        // expect(await response.text()).to.equal('TEST')

        resolve()
      }
    })

    await Server.listen()
    await Server.destroy()
  })


})
