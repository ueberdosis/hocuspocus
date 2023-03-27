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
   * A Hocuspocus Cloud App ID, get one here: https://tt-collab.de
   */
  appId: string,
}

export class TiptapCollabProvider extends HocuspocusProvider {
  constructor(configuration: TiptapCollabProviderConfiguration) {
    if (!configuration.url) {
      configuration.url = `wss://${configuration.appId}.tt-collab.de`
    }

    super(configuration as HocuspocusProviderConfiguration)
  }
}
