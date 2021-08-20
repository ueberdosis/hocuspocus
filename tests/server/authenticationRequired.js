import assert from 'assert'
import { Hocuspocus } from '../../packages/server/src'

context('server/authenticationRequired', () => {
  it('requires a token when the onAuthenticate hook is present', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
      async onAuthenticate() {
      //
      },
    }).listen()

    assert.strictEqual(Server.authenticationRequired, true)
    Server.destroy()
    done()
  })

  it('doesn’t require a token when the onAuthenticate hook isn’t present', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
    }).listen()

    assert.strictEqual(Server.authenticationRequired, false)
    Server.destroy()
    done()
  })

  it('requires a token when the onAuthenticate hook is present in a extension', done => {
    const Server = new Hocuspocus()

    class CustomExtension {
      async onAuthenticate() {
      //
      }
    }

    Server.configure({
      port: 4000,
      extensions: [
      // @ts-ignore
        new CustomExtension(),
      ],
    }).listen()

    assert.strictEqual(Server.authenticationRequired, true)
    Server.destroy()
    done()
  })
})
