import {
  CompleteHocuspocusProviderWebsocketConfiguration,
  HocuspocusProviderWebsocket, HocuspocusProviderWebsocketConfiguration,
} from './HocuspocusProviderWebsocket.js'

export type TiptapCollabProviderWebsocketConfiguration =
  Partial<CompleteHocuspocusProviderWebsocketConfiguration> &
  AdditionalTiptapCollabProviderWebsocketConfiguration

export interface AdditionalTiptapCollabProviderWebsocketConfiguration {
  /**
   * A Hocuspocus Cloud App ID, get one here: https://cloud.tiptap.dev
   */
  appId?: string,

  /**
   * If you are using the on-premise version of TiptapCollab, put your baseUrl here (e.g. https://collab.yourdomain.com)
   */
  baseUrl?: string
}

export class TiptapCollabProviderWebsocket extends HocuspocusProviderWebsocket {
  constructor(configuration: TiptapCollabProviderWebsocketConfiguration) {
    super({ ...configuration as HocuspocusProviderWebsocketConfiguration, url: configuration.baseUrl ?? `wss://${configuration.appId}.collab.tiptap.cloud` })
  }
}
