import {
  CompleteHocuspocusProviderWebsocketConfiguration,
  HocuspocusProviderWebsocket, HocuspocusProviderWebsocketConfiguration,
} from './HocuspocusProviderWebsocket.js'

export type TiptapCollabProviderWebsocketConfiguration =
  Partial<CompleteHocuspocusProviderWebsocketConfiguration> &
  AdditionalTiptapCollabProviderWebsocketConfiguration

export interface AdditionalTiptapCollabProviderWebsocketConfiguration {
  /**
   * A Hocuspocus Cloud App ID, get one here: https://collab.tiptap.dev
   */
  appId: string,
}

export class TiptapCollabProviderWebsocket extends HocuspocusProviderWebsocket {
  constructor(configuration: TiptapCollabProviderWebsocketConfiguration) {
    super({ ...configuration as HocuspocusProviderWebsocketConfiguration, url: `wss://${configuration.appId}.collab.tiptap.cloud` })
  }
}
