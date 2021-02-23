/* eslint-disable */
import assert from 'assert'
import { Hocuspocus } from '../packages/server/src'

context('.listen()', () => {
  it('should start an instance', (done) => {
    const Server = new Hocuspocus()
    Server.configure({
      port: 1234,
    })
    Server.listen()

    done()
  })

  it('should respond with ok', (done) => {
    const Server = new Hocuspocus()
    Server.configure({
      port: 1234,
    })
    Server.listen()

    console.log(
      fetch('localhost:1234')
    )

    done()
  })
})
