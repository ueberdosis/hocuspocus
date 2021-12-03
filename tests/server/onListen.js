import { Hocuspocus } from '@hocuspocus/server'

context.only('server/onListen', () => {
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

  it('executes the callback passed to listen()', done => {
    const server = new Hocuspocus()

    server.listen(4000, () => {
      server.destroy()
      done()
    })
  })

  it('executes an async callback passed to listen()', done => {
    const server = new Hocuspocus()

    server.listen(4000, async () => {
      server.destroy()
      done()
    })
  })

  it('executes the callback passed as the first parameter to listen()', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
    }).listen(() => {
      server.destroy()
      done()
    })
  })
})
