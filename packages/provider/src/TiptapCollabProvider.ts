import {
  HocuspocusProvider,
  HocuspocusProviderConfiguration,
} from './HocuspocusProvider'

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
    if (!configuration.url) {
      configuration.url = `wss://${configuration.appId}.collab.tiptap.cloud`
    }

    if (!configuration.token) {
      configuration.token = 'notoken'
    }

    super(configuration as HocuspocusProviderConfiguration)
  }
}
