import {
  HocuspocusProvider,
  HocuspocusProviderConfiguration,
} from './HocuspocusProvider'
import {
  HocuspocusProviderWebsocket,
} from './HocuspocusProviderWebsocket'

export type TiptapCollabProviderConfiguration =
  Required<Pick<HocuspocusProviderConfiguration, 'name'>> &
  Partial<HocuspocusProviderConfiguration> &
  AdditionalTiptapCollabProviderConfiguration

export interface AdditionalTiptapCollabProviderConfiguration {
  /**
   * A Hocuspocus Cloud App ID, get one here: https://collab.tiptap.dev
   */
  appId: string,
}

export class TiptapCollabProvider extends HocuspocusProvider {
  constructor(configuration: TiptapCollabProviderConfiguration) {
    if (!configuration.websocketProvider) {
      configuration.websocketProvider = new HocuspocusProviderWebsocket({ url: `wss://${configuration.appId}.collab.tiptap.cloud` })
    }

    if (!configuration.token) {
      configuration.token = 'notoken'
    }

    super(configuration as HocuspocusProviderConfiguration)
  }
}
