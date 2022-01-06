import assert from 'assert'
import { Hocuspocus } from '@hocuspocus/server'

context('server/requiresAuthentication', () => {
  it('requires a token when the onAuthenticate hook is present', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async onAuthenticate() {
      //
      },
    }).listen()

    assert.strictEqual(server.requiresAuthentication, true)
    server.destroy()
    done()
  })

  it('doesn’t require a token when the onAuthenticate hook isn’t present', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
    }).listen()

    assert.strictEqual(server.requiresAuthentication, false)
    server.destroy()
    done()
  })

  it('requires a token when the onAuthenticate hook is present in a extension', done => {
    const server = new Hocuspocus()

    class CustomExtension {
      async onAuthenticate() {
      //
      }
    }

    server.configure({
      port: 4000,
      extensions: [
      // @ts-ignore
        new CustomExtension(),
      ],
    }).listen()

    assert.strictEqual(server.requiresAuthentication, true)
    server.destroy()
    done()
  })
})
