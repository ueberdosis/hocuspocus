import { chromium } from 'playwright'
import assert from 'assert'
import { Hocuspocus } from '../../packages/server/src'

context('server/listen', () => {
  let browser
  let page

  before(async () => {
    browser = await chromium.launch()
    page = await browser.newPage()
  })

  after(async () => {
    await page.close()
    await browser.close()
  })

  it('should respond with OK on a custom port', async () => {
    const Server = new Hocuspocus()
    Server.configure({ port: 4000 }).listen()
    await page.goto('http://localhost:4000')

    assert.strictEqual(await page.textContent('html'), 'OK')

    Server.destroy()
  })
}).timeout(15000)
