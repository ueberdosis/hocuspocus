import type { HocuspocusProviderWebsocketConfiguration } from '@hocuspocus/provider'
import { HocuspocusProviderWebsocket } from '@hocuspocus/provider'
import type { Hocuspocus } from '@hocuspocus/server'
import { onTestFinished } from 'vite-plus/test'

export const newHocuspocusProviderWebsocket = (
  hocuspocus: Hocuspocus,
  options: Partial<Omit<HocuspocusProviderWebsocketConfiguration, 'url'>> = {},
) => {
  const ws = new HocuspocusProviderWebsocket({
    url: hocuspocus.server!.webSocketURL,
    ...options,
  })

  onTestFinished(() => ws.destroy())

  return ws
}
