import type { ServerConfiguration } from '@hocuspocus/server'
import { Server } from '@hocuspocus/server'
import { onTestFinished } from 'vite-plus/test'

export const newHocuspocus = (options?: Partial<ServerConfiguration>) => {
  const server = new Server({
    quiet: true,
    port: 0,
    stopOnSignals: false,
    ...options,
  })

  onTestFinished(() => {
    server.hocuspocus.closeConnections()
    server.httpServer.closeAllConnections()
    server.httpServer.close()
  })

  return server.listen()
}
