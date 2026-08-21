import { describe, expect, onTestFinished, test } from 'vite-plus/test'

import { Throttle } from '@hocuspocus/extension-throttle'

describe('configuration', () => {
  test('throttle has the default configuration', async t => {
    const throttle = new Throttle()
    onTestFinished(() => throttle.onDestroy())
    expect(throttle.configuration.throttle).toBe(15)
  })

  test('banTime has the default configuration', async t => {
    const throttle = new Throttle()
    onTestFinished(() => throttle.onDestroy())
    expect(throttle.configuration.banTime).toBe(5)
  })

  test('throttle has a custom value', async t => {
    const throttle = new Throttle({ throttle: 100 })
    onTestFinished(() => throttle.onDestroy())
    expect(throttle.configuration.throttle).toBe(100)
  })

  test('banTime has a custom value', async t => {
    const throttle = new Throttle({ banTime: 100 })
    onTestFinished(() => throttle.onDestroy())
    expect(throttle.configuration.banTime).toBe(100)
  })
})
