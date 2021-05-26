import { Server } from '../../packages/server/src'

context('server/onListen', () => {
  afterEach(() => {
    Server.destroy()
  })

  it('onListen callback is executed', done => {
    Server.configure({
      port: 4000,
      async onListen() {
        done()
      },
    }).listen()
  })
})
