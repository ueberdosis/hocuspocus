import type { HocuspocusProviderWebsocketConfiguration} from '@hocuspocus/provider'
import {
  HocuspocusProviderWebsocket,
} from '@hocuspocus/provider'
import type { Hocuspocus } from '@hocuspocus/server'
import WebSocket from 'ws'

export const newHocuspocusProviderWebsocket = (
  hocuspocus: Hocuspocus,
  options: Partial<Omit<HocuspocusProviderWebsocketConfiguration, 'url'>> = {},
) => {
  return new HocuspocusProviderWebsocket({
    // We don’t need which port the server is running on, but
    // we can get the URL from the passed server instance.
    url: hocuspocus.server!.webSocketURL,
    // Pass a polyfill to use WebSockets in a Node.js environment.
    WebSocketPolyfill: WebSocket,
    ...options,
  })
}
