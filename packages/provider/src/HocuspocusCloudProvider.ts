import { HocuspocusProvider, HocuspocusProviderOptions } from './HocuspocusProvider'

export interface HocuspocusCloudProviderOptions extends HocuspocusProviderOptions {
  /**
   * A Hocuspocus Cloud key, get one here: https://hocuspocus.cloud/
   */
  key: string,
}

export class HocuspocusCloudProvider extends HocuspocusProvider {
  constructor(options: HocuspocusCloudProviderOptions) {
    if (!options.url) {
      options.url = 'wss://connect.hocuspocus.cloud'
    }

    if (options.key) {
      if (!options.parameters) {
        options.parameters = {}
      }

      options.parameters.key = options.key
    }

    super(options as HocuspocusProviderOptions)
  }
}
