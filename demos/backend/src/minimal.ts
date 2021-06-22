import { Logger } from '../../../packages/logger/src'
import { Server } from '../../../packages/server/src'

const server = Server.configure({
  port: 1234,
  extensions: [
    new Logger(),
  ],

  // Test error handling
  // async onConnect(data) {
  //   throw new Error('CRASH')
  // },

  // async onConnect(data) {
  //   await new Promise((resolve, reject) => setTimeout(() => {
  //     // @ts-ignore
  //     reject()
  //   }, 1337))
  // },

  // async onConnect(data) {
  //   await new Promise((resolve, reject) => setTimeout(() => {
  //     // @ts-ignore
  //     resolve()
  //   }, 1337))
  // },
})

server.listen()
