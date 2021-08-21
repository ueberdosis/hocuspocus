import { Hocuspocus } from '../../packages/server/src'

context('server/onListen', () => {
  it('executes the onListen callback', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
      async onListen() {
        Server.destroy()
        done()
      },
    }).listen()
  })

  it('executes the onListen callback from an extension', done => {
    const Server = new Hocuspocus()

    class CustomExtension {
      async onListen() {
        Server.destroy()
        done()
      }
    }

    Server.configure({
      port: 4000,
      extensions: [
        new CustomExtension(),
      ],
    }).listen()
  })
})
