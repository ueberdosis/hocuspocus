import { ExecutionContext } from 'ava'

import { chromium, Page } from 'playwright'

const browserPromise = chromium.launch()

export const pageMacro = async function (t: ExecutionContext, callback: any) {
  const browser = await browserPromise
  const page = await browser.newPage()
  try {
    await callback(t, page)
  } finally {
    await page.close()
  }
}
