import { chromium } from 'playwright'
import assert from 'assert'
import { Hocuspocus } from '../../packages/server/src'

context('server/listen', () => {
  let browser

  before(async () => {
    browser = await chromium.launch()
  })

  after(async () => {
    await browser.close()
  })

  it('should respond with OK on a custom port', async () => {
    const page = await browser.newPage()
    const Server = new Hocuspocus()
    Server.configure({ port: 4000 }).listen()

    await page.goto('http://localhost:4000')

    assert.strictEqual(await page.textContent('html'), 'OK')
    await page.close()
    Server.destroy()
  })
})
