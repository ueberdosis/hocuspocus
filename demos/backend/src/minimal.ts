import { Logger } from '../../../packages/logger/src'
import { Server } from '../../../packages/server/src'

const server = Server.configure({
  port: 1234,
  extensions: [
    new Logger(),
  ],

  async onConnect(data) {
    await new Promise((resolve, reject) => setTimeout(() => {
      // @ts-ignore
      // reject()
      // @ts-ignore
      resolve()
    }, 1337))
  },
})

server.listen()
