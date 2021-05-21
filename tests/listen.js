import { chromium } from 'playwright'
import assert from 'assert'
import { Server } from '../packages/server/src'

context('listen', () => {
  let browser
  before(async () => {
    browser = await chromium.launch()
  })
  after(async () => {
    await browser.close()
    Server.destroy()
  })

  let page
  beforeEach(async () => {
    page = await browser.newPage()
  })
  afterEach(async () => {
    await page.close()
  })

  it('should respond with OK on the default port', async () => {
    Server.listen()

    await page.goto('http://localhost:80')

    assert.strictEqual(await page.textContent('html'), 'OK')
  })

  it('should respond with OK on a custom port', async () => {
    Server.configure({ port: 1234 }).listen()

    await page.goto('http://localhost:1234')

    assert.strictEqual(await page.textContent('html'), 'OK')
  })
})
