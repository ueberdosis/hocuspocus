import { Hocuspocus } from '@hocuspocus/server'
import { Logger } from '@hocuspocus/extension-logger'
import sinon from 'sinon'
import assert from 'assert'

const fakeLogger = message => {
}

context('extension-logger/onListen', () => {
  it.skip('logs something', done => {
    const spy = sinon.spy(fakeLogger)

    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async onListen() {
        server.destroy()

        assert(spy.callCount > 1, 'Expected the Logger to log something, but didn’t receive anything.')
        assert(spy.callCount === 11, `Expected it to log 11 times, but actually logged ${spy.callCount} times`)

        done()
      },
      extensions: [
        new Logger({
          log: spy,
        }),
      ],
    }).listen()
  })

  it('uses the global instance name', done => {
    const spy = sinon.spy(fakeLogger)

    const server = new Hocuspocus()

    server.configure({
      name: 'FOOBAR123',
      port: 4000,
      async onListen() {
        server.destroy()
      },
      async onDestroy() {
        assert.equal(spy.args[spy.args.length - 1][0].includes('FOOBAR123'), true, 'Expected the Logger to use the configured instance name.')

        done()
      },
      extensions: [
        new Logger({
          log: spy,
        }),
      ],
    }).listen()
  })

  it('doesn’t log anything if all messages are disabled', done => {
    const spy = sinon.spy(fakeLogger)

    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async onListen() {
        server.destroy()
      },
      async onDestroy() {
        assert.equal(spy.callCount, 0, 'Expected the Logger to not log anything.')

        done()
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
          onListen: false,
          onDestroy: false,
          onConfigure: false,
        }),
      ],
    }).listen()
  })
})
