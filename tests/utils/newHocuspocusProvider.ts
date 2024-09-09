import {
  HocuspocusProvider,
  type HocuspocusProviderConfiguration, type HocuspocusProviderWebsocketConfiguration,
} from '@hocuspocus/provider'
import type { Hocuspocus } from '@hocuspocus/server'
import { newHocuspocusProviderWebsocket } from './newHocuspocusProviderWebsocket.js'

export const newHocuspocusProvider = (
  server: Hocuspocus,
  options: Partial<HocuspocusProviderConfiguration> = {},
  websocketOptions: Partial<HocuspocusProviderWebsocketConfiguration> = {},
): HocuspocusProvider => {
  return new HocuspocusProvider({
    websocketProvider: newHocuspocusProviderWebsocket(server, websocketOptions),
    // Just use a generic document name for all tests.
    name: 'hocuspocus-test',
    // Add or overwrite settings, depending on the test case.
    ...options,
  })
}
