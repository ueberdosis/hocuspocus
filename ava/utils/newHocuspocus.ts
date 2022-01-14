import { Hocuspocus, Configuration } from '@hocuspocus/server'

export const newHocuspocus = (options?: Partial<Configuration>): Hocuspocus => {
  const server = new Hocuspocus()

  server.configure({
    quiet: true,
    port: 0,
    ...options,
  })

  return server
}
