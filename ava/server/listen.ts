import test, { ExecutionContext } from 'ava'
import { Page } from 'playwright'
import { newHocuspocus, pageMacro } from '../utils'

test('should respond with OK on a custom port', pageMacro, async (t: ExecutionContext, page: Page) => {
  const server = newHocuspocus()
  server.listen()

  await page.goto(server.httpURL)

  t.is(await page.textContent('html'), 'OK')
})

test('should respond with OK on a custom port passed to listen()', pageMacro, async (t: ExecutionContext, page: Page) => {
  const server = newHocuspocus()
  server.listen()

  await page.goto(server.httpURL)

  t.is(await page.textContent('html'), 'OK')
})
