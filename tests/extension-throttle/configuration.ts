import test from 'ava'
import { Throttle } from '@hocuspocus/extension-throttle'

test('throttle has the default configuration', async t => {
  t.is(new Throttle().configuration.throttle, 15)
})

test('banTime has the default configuration', async t => {
  t.is(new Throttle().configuration.banTime, 5)
})

test('throttle has a custom value', async t => {
  t.is(new Throttle({ throttle: 100 }).configuration.throttle, 100)
})

test('banTime has a custom value', async t => {
  t.is(new Throttle({ banTime: 100 }).configuration.banTime, 100)
})
