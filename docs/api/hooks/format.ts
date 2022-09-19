import { debounce } from 'debounce'
import { Server } from '@hocuspocus/server'
import { TiptapTransformer } from '@hocuspocus/transformer'
import { writeFile } from 'fs'

let debounced

const server = Server.configure({
  beforeHandleMessage(data) {
    if (data.context.tokenExpiresAt <= new Date()) {
      const error: CloseEvent = {
        reason: 'Token expired',
      }

      throw error
    }
  },
})

server.listen()
