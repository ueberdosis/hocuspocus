import assert from 'assert'
import { Hocuspocus } from '@hocuspocus/server'

const server = new Hocuspocus()

context('server/onRequest', () => {
  afterEach(async () => {
    server.destroy()
  })

  it('executes the onRequest callback', done => {
    server.configure({
      port: 4000,
      onListen() {
        page.goto('http://localhost:4000/foobar')
      },
      async onRequest({ request, instance }) {
        assert.strictEqual(instance, server)
        assert.strictEqual(request.url, '/foobar')
        done()
      },
    }).listen()
  })

  it('executes the onRequest callback of a custom extension', done => {
    class CustomExtension {
      async onRequest({ response }) {
        return new Promise((resolve, reject) => {

          response.writeHead(200, { 'Content-Type': 'text/plain' })
          response.end('I like cats.')

          return reject()
        })
      }
    }

    server.configure({
      port: 4000,
      extensions: [
        new CustomExtension(),
      ],
      async onListen() {
        await page.goto('http://localhost:4000/')

        assert.strictEqual(await page.textContent('html'), 'I like cats.')

        done()
      },
    }).listen()
  })

})
