import { chromium } from 'playwright'
import assert from 'assert'
import { Server } from '../../packages/server/src'

context('server/listen', () => {
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

  it('should respond with OK on a custom port', async () => {
    Server.configure({ port: 4000 }).listen()

    await page.goto('http://localhost:4000')

    assert.strictEqual(await page.textContent('html'), 'OK')
  })
})
