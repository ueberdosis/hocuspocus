import { HocuspocusProvider, HocuspocusProviderConfiguration } from '@hocuspocus/provider'
import { Hocuspocus } from '@hocuspocus/server'
import WebSocket from 'ws'

export const newHocuspocusProvider = (
  server: Hocuspocus,
  options: Partial<Omit<HocuspocusProviderConfiguration, 'url'>> = {},
): HocuspocusProvider => {
  return new HocuspocusProvider({
    url: server.webSocketURL,
    name: 'hocuspocus-test',
    ...options,
    WebSocketPolyfill: WebSocket,
  })
}
