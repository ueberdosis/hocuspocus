import test, { ExecutionContext } from 'ava'
import { Page } from 'playwright'
import { Hocuspocus } from '@hocuspocus/server'
import { newHocuspocus, pageMacro } from '../utils'

test('should respond with OK', pageMacro, async (t: ExecutionContext, page: Page) => {
  const server = await newHocuspocus()

  await page.goto(server.httpURL)

  t.is(await page.textContent('html'), 'OK')
})

test('should respond with OK on a custom port', pageMacro, async (t: ExecutionContext, page: Page) => {
  const server = await newHocuspocus({
    port: 4000,
  })

  await page.goto(server.httpURL)

  t.is(server.address.port, 4000)
  t.is(await page.textContent('html'), 'OK')
})

test('should respond with OK on a custom port passed to listen()', pageMacro, async (t: ExecutionContext, page: Page) => {
  const server = new Hocuspocus().configure({
    quiet: true,
    port: 0,
  })

  server.listen(4001)

  await page.goto(server.httpURL)

  t.is(server.address.port, 4001)
  t.is(await page.textContent('html'), 'OK')
})

test('should take a custom port and a callback', pageMacro, async (t: ExecutionContext, page: Page) => {
  const server = new Hocuspocus().configure({
    quiet: true,
    port: 0,
  })

  await new Promise(resolve => {
    server.listen(4002, () => {
      resolve('done')
    })
  })

  await page.goto(server.httpURL)

  t.is(server.address.port, 4002)
  t.is(await page.textContent('html'), 'OK')
})

test('should execute a callback', pageMacro, async (t: ExecutionContext, page: Page) => {
  const server = new Hocuspocus().configure({
    quiet: true,
    port: 0,
  })

  await new Promise(resolve => {
    server.listen(async () => {
      resolve('done')
    })
  })

  await page.goto(server.httpURL)

  t.is(await page.textContent('html'), 'OK')
})

test('should have the custom port as a parameter in the callback', pageMacro, async (t: ExecutionContext, page: Page) => {
  const server = new Hocuspocus().configure({
    quiet: true,
    port: 0,
  })

  await new Promise(resolve => {
    server.listen(async ({ port }) => {
      t.is(port, server.address.port)
      resolve('done')
    })
  })

  await page.goto(server.httpURL)

  t.is(await page.textContent('html'), 'OK')
})
