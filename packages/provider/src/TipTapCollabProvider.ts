import {
  HocuspocusProvider,
  HocuspocusProviderConfiguration,
} from './HocuspocusProvider'

export type TipTapCollabProviderConfiguration =
  Required<Pick<HocuspocusProviderConfiguration, 'name'>> &
  Partial<HocuspocusProviderConfiguration> &
  AdditionalTipTapCollabProviderConfiguration

export interface AdditionalTipTapCollabProviderConfiguration {
  /**
   * A Hocuspocus Cloud App ID, get one here: https://tt-collab.de
   */
  appId: string,
}

export class TipTapCollabProvider extends HocuspocusProvider {
  constructor(configuration: TipTapCollabProviderConfiguration) {
    if (!configuration.url) {
      configuration.url = `wss://${configuration.appId}.tt-collab.de`
    }

    super(configuration as HocuspocusProviderConfiguration)
  }
}
