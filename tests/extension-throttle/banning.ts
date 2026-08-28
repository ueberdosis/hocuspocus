import { describe, expect, onTestFinished, test } from 'vite-plus/test'

import type { onConnectPayload } from '@hocuspocus/server'
import * as MockDate from 'mockdate'
import { Throttle } from '@hocuspocus/extension-throttle'

const getOnConnectPayload = (ip: string) => {
  return {
    request: {
      headers: new Headers({
        'x-real-ip': ip,
      }),
    },
  } as unknown as onConnectPayload
}
const generateRequests = async (instance: Throttle, ip: string, numberOfRequests: number) => {
  for (let i = 0; i < numberOfRequests; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await instance.onConnect(getOnConnectPayload(ip))
  }
}

describe('banning', () => {
  test('throttle extension bans properly', async t => {
    const throttle = new Throttle({ banTime: 5, throttle: 15 })
    onTestFinished(() => throttle.onDestroy())
    const ip = '127.0.0.1'

    expect(throttle.isBanned(ip)).toBe(false)

    await generateRequests(throttle, ip, 15)

    try {
      await throttle.onConnect(getOnConnectPayload(ip))
      expect.fail()
    } catch (e) {
      expect(throttle.isBanned(ip)).toBe(true)
    }
  })

  test('throttle extension unbans properly', async t => {
    const throttle = new Throttle({ banTime: 5, throttle: 15 })
    onTestFinished(() => throttle.onDestroy())
    const ip = '127.0.0.1'

    expect(throttle.isBanned(ip)).toBe(false)

    await generateRequests(throttle, ip, 15)

    try {
      await throttle.onConnect(getOnConnectPayload(ip))
      expect.fail()
    } catch (e) {
      expect(throttle.isBanned(ip)).toBe(true)
    }

    MockDate.set(Date.now() + 1000 * (throttle.configuration.banTime * 60))

    await throttle.onConnect(getOnConnectPayload(ip))
    expect(throttle.isBanned(ip)).toBe(false)

    MockDate.reset()
  })

  test('map cleanup works for connectionsByIp', async t => {
    const throttle = new Throttle({ consideredSeconds: 60 })
    onTestFinished(() => throttle.onDestroy())
    const ip = '127.0.0.1'

    await generateRequests(throttle, ip, 10)

    expect(throttle.connectionsByIp.get(ip)!.length).toBe(10)

    MockDate.set(Date.now() + 1000 * throttle.configuration.consideredSeconds)

    await throttle.clearMaps()

    expect(throttle.connectionsByIp.has(ip)).toBe(false)

    MockDate.reset()
  })

  test('map cleanup works for bannedIps', async t => {
    const throttle = new Throttle({ consideredSeconds: 60, throttle: 15 })
    onTestFinished(() => throttle.onDestroy())
    const ip = '127.0.0.1'

    await generateRequests(throttle, ip, 15)

    try {
      await throttle.onConnect(getOnConnectPayload(ip))
      // eslint-disable-next-line no-empty
    } catch (e) {}

    expect(throttle.bannedIps.has(ip)).toBe(true)

    MockDate.set(Date.now() + 1000 * throttle.configuration.banTime * 60)

    await throttle.clearMaps()

    expect(throttle.bannedIps.has(ip)).toBe(false)

    MockDate.reset()
  })
})
