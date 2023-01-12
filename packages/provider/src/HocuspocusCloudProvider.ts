import {
  HocuspocusProvider,
  HocuspocusProviderConfiguration,
} from './HocuspocusProvider'
import {
  HocuspocusProviderWebsocket,
  HocuspocusProviderWebsocketConfiguration,
} from './HocuspocusProviderWebsocket'

export type HocuspocusCloudProviderConfiguration =
  Required<Pick<HocuspocusProviderConfiguration, 'name'>> &
  Partial<HocuspocusProviderConfiguration> &
  Partial<Pick<HocuspocusProviderWebsocketConfiguration, 'url'>> &
AdditionalHocuspocusCloudProviderConfiguration

export interface AdditionalHocuspocusCloudProviderConfiguration {
  /**
   * A Hocuspocus Cloud key, get one here: https://hocuspocus.cloud/
   */
  key: string,
}

export class HocuspocusCloudProvider extends HocuspocusProvider {
  constructor(configuration: HocuspocusCloudProviderConfiguration) {
    if (!configuration.url) {
      configuration.url = 'wss://connect.hocuspocus.cloud'
    }

    if (configuration.key) {
      if (!configuration.parameters) {
        configuration.parameters = {}
      }

      configuration.parameters.key = configuration.key
    }

    configuration.websocketProvider = new HocuspocusProviderWebsocket({ url: configuration.url })

    super(configuration as HocuspocusProviderConfiguration)
  }
}
