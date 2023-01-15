import test from 'ava'
import { Throttle } from '@hocuspocus/extension-throttle'
import { onConnectPayload } from '@hocuspocus/server'
import * as MockDate from 'mockdate'

const getOnConnectPayload = (ip: string) => {
  return {
    request: {
      headers: {
        'x-real-ip': ip,
      },
    },
  } as unknown as onConnectPayload
}
const generateRequests = async (instance: Throttle, ip: string, numberOfRequests: number) => {
  for (let i = 0; i < numberOfRequests; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await instance.onConnect(getOnConnectPayload(ip))
  }
}

test('throttle extension bans properly', async t => {
  const throttle = new Throttle({ banTime: 5, throttle: 15 })
  const ip = '127.0.0.1'

  t.false(throttle.isBanned(ip))

  await generateRequests(throttle, ip, 15)

  try {
    await throttle.onConnect(getOnConnectPayload(ip))
    t.fail()
  } catch (e) {
    t.true(throttle.isBanned(ip))
  }

})

test('throttle extension unbans properly', async t => {
  const throttle = new Throttle({ banTime: 5, throttle: 15 })
  const ip = '127.0.0.1'

  t.false(throttle.isBanned(ip))

  await generateRequests(throttle, ip, 15)

  try {
    await throttle.onConnect(getOnConnectPayload(ip))
    t.fail()
  } catch (e) {
    t.true(throttle.isBanned(ip))
  }

  MockDate.set(Date.now() + 1000 * (throttle.configuration.banTime * 60))

  await throttle.onConnect(getOnConnectPayload(ip))
  t.false(throttle.isBanned(ip))

  MockDate.reset()
})

test('map cleanup works for connectionsByIp', async t => {
  const throttle = new Throttle({ consideredSeconds: 60 })
  const ip = '127.0.0.1'

  await generateRequests(throttle, ip, 10)

  t.is(throttle.connectionsByIp.get(ip)!.length, 10)

  MockDate.set(Date.now() + 1000 * throttle.configuration.consideredSeconds)

  await throttle.clearMaps()

  t.false(throttle.connectionsByIp.has(ip))

  MockDate.reset()
})

test('map cleanup works for bannedIps', async t => {
  const throttle = new Throttle({ consideredSeconds: 60, throttle: 15 })
  const ip = '127.0.0.1'

  await generateRequests(throttle, ip, 15)

  try {
    await throttle.onConnect(getOnConnectPayload(ip))
    // eslint-disable-next-line no-empty
  } catch (e) {}

  t.true(throttle.bannedIps.has(ip))

  MockDate.set(Date.now() + 1000 * throttle.configuration.banTime * 60)

  await throttle.clearMaps()

  t.false(throttle.bannedIps.has(ip))

  MockDate.reset()
})
