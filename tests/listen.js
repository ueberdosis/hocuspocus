import { chromium } from 'playwright'
import assert from 'assert'

// hocuspocus
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  port: 1234,
})

server.listen()

// setup
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
})

// tests
it('should respond with OK', async () => {
  await page.goto('http://localhost:1234/')

  assert.equal(await page.textContent('html'), 'OK')
})
