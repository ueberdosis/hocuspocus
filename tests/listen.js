import { chromium } from 'playwright'
import assert from 'assert'
import { Server } from '../packages/server/src'

/**
 * Set up the server
 */
const server = Server.configure({
  port: 1234,
})

/**
 * Tests
 */
context('listen', () => {
  let browser

  before(async () => {
    browser = await chromium.launch()

    server.listen()
  })

  after(async () => {
    await browser.close()

    server.destroy()
  })

  let page

  beforeEach(async () => {
    page = await browser.newPage()
  })

  afterEach(async () => {
    await page.close()
  })

  it('should respond with OK', async () => {
    await page.goto('http://localhost:1234/')

    assert.strictEqual(await page.textContent('html'), 'OK')
  })
})
