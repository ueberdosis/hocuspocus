import test from 'ava'
import sinon from 'sinon'
import { Logger } from '@hocuspocus/extension-logger'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.js'

const fakeLogger = (message: any) => {
}

test('logs something', async t => {
  await new Promise(async resolve => {
    const spy = sinon.spy(fakeLogger)

    const server = await newHocuspocus({
      extensions: [
        new Logger({
          log: spy,
        }),
      ],
    })

    newHocuspocusProvider(server, {
      onConnect() {
        t.true(spy.callCount > 1, 'Expected the Logger to log something, but didn’t receive anything.')
        t.true(spy.callCount === 3, `Expected it to log 11 times, but actually logged ${spy.callCount} times`)

        resolve('done')
      },
    })
  })
})

test('uses the global instance name', async t => {
  await new Promise(async resolve => {
    const spy = sinon.spy(fakeLogger)

    const server = await newHocuspocus({
      name: 'FOOBAR123',
      async onDestroy() {
        t.is(spy.args[spy.args.length - 1][0].includes('FOOBAR123'), true, 'Expected the Logger to use the configured instance name.')

        resolve('done')
      },
      extensions: [
        new Logger({
          log: spy,
        }),
      ],
    })

    await server.destroy()
  })

})

test('doesn’t log anything if all messages are disabled', async t => {
  await new Promise(async resolve => {
    const spy = sinon.spy(fakeLogger)

    const server = await newHocuspocus({
      async onDestroy() {
        t.is(spy.callCount, 0, 'Expected the Logger to not log anything.')

        resolve('done')
      },
      extensions: [
        new Logger({
          log: spy,
          // TODO: Those hooks aren’t triggered anyway.
          // onLoadDocument: false,
          // onChange: false,
          // onConnect: false,
          // onDisconnect: false,
          // onUpgrade: false,
          // onRequest: false,
          // @ts-ignore
          onListen: false,
          onDestroy: false,
          onConfigure: false,
        }),
      ],
    })

    await server.destroy()
  })
})
