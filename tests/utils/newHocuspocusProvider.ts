import {
  HocuspocusProvider,
  type HocuspocusProviderConfiguration,
  type HocuspocusProviderWebsocket,
  type HocuspocusProviderWebsocketConfiguration,
} from '@hocuspocus/provider'
import type { Hocuspocus } from '@hocuspocus/server'
import { newHocuspocusProviderWebsocket } from './newHocuspocusProviderWebsocket.js'

export const newHocuspocusProvider = (
  server: Hocuspocus,
  options: Partial<HocuspocusProviderConfiguration> = {},
  websocketOptions: Partial<HocuspocusProviderWebsocketConfiguration> = {},
  websocketProvider?: HocuspocusProviderWebsocket,
): HocuspocusProvider => {
  return new HocuspocusProvider({
    websocketProvider: websocketProvider ?? newHocuspocusProviderWebsocket(server, websocketOptions),
    // Just use a generic document name for all tests.
    name: 'hocuspocus-test',
    // There is no need to share data with other browser tabs in the testing environment.
    broadcast: false,
    // We don’t need console logging in tests. If we actually do, we can overwrite it anyway.
    quiet: false,
    // Add or overwrite settings, depending on the test case.
    ...options,
  })
}
