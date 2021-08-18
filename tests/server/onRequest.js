import { chromium } from 'playwright'
import assert from 'assert'
import { Hocuspocus } from '../../packages/server/src'

const Server = new Hocuspocus()

context('server/onRequest', () => {
  let browser

  before(async () => {
    browser = await chromium.launch()
  })

  after(async () => {
    await browser.close()
  })

  let page

  beforeEach(async () => {
    page = await browser.newPage()
  })

  afterEach(async () => {
    await page.close()
    Server.destroy()
  })

  it('executes the onRequest callback', done => {
    Server.configure({
      port: 4000,
      async onListen() {
        await page.goto('http://localhost:4000/foobar')
      },
      async onRequest({ request }) {
        setTimeout(() => {
          assert.strictEqual(request.url, '/foobar')
          done()
        }, 0)
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

    Server.configure({
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
