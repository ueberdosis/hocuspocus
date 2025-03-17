import { Server, ServerConfiguration } from '@hocuspocus/server'

export const newHocuspocus = (options?: Partial<ServerConfiguration>) => {
  const server = new Server({
    // We don’t need the logging in testing.
    quiet: true,
    // Binding something port 0 will end up on a random free port.
    // That’s helpful to run tests concurrently.
    port: 0,
    // Add or overwrite settings, depending on the test case.
    ...options,
  })

  return server.listen()
}
