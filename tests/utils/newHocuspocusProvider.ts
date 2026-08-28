import {
  HocuspocusProvider,
  type HocuspocusProviderConfiguration,
  type HocuspocusProviderWebsocket,
  type HocuspocusProviderWebsocketConfiguration,
} from '@hocuspocus/provider'
import type { Hocuspocus } from '@hocuspocus/server'
import { onTestFinished } from 'vite-plus/test'
import { newHocuspocusProviderWebsocket } from './newHocuspocusProviderWebsocket.ts'

export const newHocuspocusProvider = (
  server: Hocuspocus,
  options: Partial<HocuspocusProviderConfiguration> = {},
  websocketOptions: Partial<HocuspocusProviderWebsocketConfiguration> = {},
  websocketProvider?: HocuspocusProviderWebsocket,
): HocuspocusProvider => {
  const provider = new HocuspocusProvider({
    websocketProvider:
      websocketProvider ?? newHocuspocusProviderWebsocket(server, websocketOptions),
    name: 'hocuspocus-test',
    ...options,
  })
  provider.attach()

  onTestFinished(() => provider.destroy())

  return provider
}
