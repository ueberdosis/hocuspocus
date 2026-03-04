import test from 'ava'
import { Throttle } from '@hocuspocus/extension-throttle'

test('throttle has the default configuration', async t => {
  const throttle = new Throttle()
  t.teardown(() => throttle.onDestroy())
  t.is(throttle.configuration.throttle, 15)
})

test('banTime has the default configuration', async t => {
  const throttle = new Throttle()
  t.teardown(() => throttle.onDestroy())
  t.is(throttle.configuration.banTime, 5)
})

test('throttle has a custom value', async t => {
  const throttle = new Throttle({ throttle: 100 })
  t.teardown(() => throttle.onDestroy())
  t.is(throttle.configuration.throttle, 100)
})

test('banTime has a custom value', async t => {
  const throttle = new Throttle({ banTime: 100 })
  t.teardown(() => throttle.onDestroy())
  t.is(throttle.configuration.banTime, 100)
})
