import { Hocuspocus } from '@hocuspocus/server'

context('server/onListen', () => {
  it('executes the onListen callback', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async onListen() {
        server.destroy()
        done()
      },
    }).listen()
  })

  it('executes the onListen callback from an extension', done => {
    const server = new Hocuspocus()

    class CustomExtension {
      async onListen() {
        server.destroy()
        done()
      }
    }

    server.configure({
      port: 4000,
      extensions: [
        new CustomExtension(),
      ],
    }).listen()
  })
})
