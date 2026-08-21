import { describe, expect, onTestFinished, test } from 'vite-plus/test'

import { Server } from '@hocuspocus/server'

describe('destroy', () => {
  test('destroy only runs once when called multiple times', async t => {
    let destroyed = 0

    const server = new Server({
      port: 0,
      quiet: true,
      stopOnSignals: false,
      async onDestroy() {
        destroyed += 1
      },
    })

    onTestFinished(() => server.httpServer.close())

    await server.listen()

    // Concurrent and subsequent calls (e.g. from repeated SIGINT signals)
    // must not re-run the shutdown, which would close already-closed
    // resources in extensions.
    await Promise.all([server.destroy(), server.destroy()])
    await server.destroy()

    expect(destroyed).toBe(1)
  })
})
