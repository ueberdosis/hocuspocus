import test from 'ava'
import { Throttle } from '@hocuspocus/extension-throttle'
import { onConnectPayload } from '@hocuspocus/server'

test('throttle extension bans properly', async t => {
  const throttle = new Throttle({ banTime: 5, throttle: 15 })
  const ip = '127.0.0.1'

  t.false(throttle.isBanned(ip))

  const onConnectPayload = {
    request: {
      headers: {
        'x-real-ip': ip,
      },
    },
  } as unknown as onConnectPayload

  for (let i = 0; i < throttle.configuration.throttle!; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await throttle.onConnect(onConnectPayload)
  }

  try {
    await throttle.onConnect(onConnectPayload)
    t.fail()
  } catch (e) {
    t.true(throttle.isBanned(ip))
  }

})

test('map cleanup works', async t => {

})
