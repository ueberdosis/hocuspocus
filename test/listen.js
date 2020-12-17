import assert from 'assert'
import { Server } from '@hocuspocus/server'

context('.listen()', () => {
  const originalConsoleLog = console.log
  let output

  beforeEach(() => {
    output = []

    console.log = (msg) => {
      output.push(msg)
    }
  })

  afterEach(function() {
    console.log = originalConsoleLog

    if (this.currentTest.state === 'failed') {
      console.log(output.join('\n'))
    }
  })

  it('should start an instance', function(done) {
    Server.listen()
    done()
  })
})
