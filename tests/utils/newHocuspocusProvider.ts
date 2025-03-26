import {
  HocuspocusProvider,
  type HocuspocusProviderConfiguration,
  type HocuspocusProviderWebsocket,
  type HocuspocusProviderWebsocketConfiguration,
} from '@hocuspocus/provider'
import type { Hocuspocus } from '@hocuspocus/server'
import { newHocuspocusProviderWebsocket } from './newHocuspocusProviderWebsocket.ts'

export const newHocuspocusProvider = (
  server: Hocuspocus,
  options: Partial<HocuspocusProviderConfiguration> = {},
  websocketOptions: Partial<HocuspocusProviderWebsocketConfiguration> = {},
  websocketProvider?: HocuspocusProviderWebsocket,
): HocuspocusProvider => {
  const provider = new HocuspocusProvider({
    websocketProvider: websocketProvider ?? newHocuspocusProviderWebsocket(server, websocketOptions),
    // Just use a generic document name for all tests.
    name: 'hocuspocus-test',
    // Add or overwrite settings, depending on the test case.
    ...options,
  })
  provider.attach()

  return provider
}
