import type { AbstractType, YArrayEvent } from 'yjs'
import {
  HocuspocusProvider,
  HocuspocusProviderConfiguration,
} from './HocuspocusProvider.js'

import { TiptapCollabProviderWebsocket } from './TiptapCollabProviderWebsocket.js'
import type { THistoryVersion } from './types'

export type TiptapCollabProviderConfiguration =
  Required<Pick<HocuspocusProviderConfiguration, 'name'>> &
  Partial<HocuspocusProviderConfiguration> &
  (Required<Pick<AdditionalTiptapCollabProviderConfiguration, 'websocketProvider'>> |
  Required<Pick<AdditionalTiptapCollabProviderConfiguration, 'appId'>>)

export interface AdditionalTiptapCollabProviderConfiguration {
  /**
   * A Hocuspocus Cloud App ID, get one here: https://collab.tiptap.dev
   */
  appId?: string,

  websocketProvider?: TiptapCollabProviderWebsocket
}

export class TiptapCollabProvider extends HocuspocusProvider {
  tiptapCollabConfigurationPrefix = '__tiptapcollab__'

  constructor(configuration: TiptapCollabProviderConfiguration) {
    if (!configuration.websocketProvider) {
      configuration.websocketProvider = new TiptapCollabProviderWebsocket({ appId: (configuration as Required<Pick<AdditionalTiptapCollabProviderConfiguration, 'appId'>>).appId })
    }

    if (!configuration.token) {
      configuration.token = 'notoken' // need to send a token anyway (which will be ignored)
    }

    super(configuration as HocuspocusProviderConfiguration)
  }

  /**
   * note: this will only work if your server loaded @hocuspocus-pro/extension-history, or if you are on a Tiptap business plan.
   */
  createVersion(name?: string) {
    return this.sendStateless(JSON.stringify({ action: 'version.create', name }))
  }

  /**
   * note: this will only work if your server loaded @hocuspocus-pro/extension-history, or if you are on a Tiptap business plan.
   */
  revertToVersion(targetVersion: number) {
    return this.sendStateless(JSON.stringify({ action: 'document.revert', version: targetVersion }))
  }

  /**
   * note: this will only work if your server loaded @hocuspocus-pro/extension-history, or if you are on a Tiptap business plan.
   *
   * The server will reply with a stateless message (THistoryVersionPreviewEvent)
   */
  previewVersion(targetVersion: number) {
    return this.sendStateless(JSON.stringify({ action: 'version.preview', version: targetVersion }))
  }

  /**
   * note: this will only work if your server loaded @hocuspocus-pro/extension-history, or if you are on a Tiptap business plan.
   */
  getVersions(): THistoryVersion[] {
    return this.configuration.document.getArray<THistoryVersion>(`${this.tiptapCollabConfigurationPrefix}versions`).toArray()
  }

  watchVersions(callback: Parameters<AbstractType<YArrayEvent<THistoryVersion>>['observe']>[0]) {
    return this.configuration.document.getArray<THistoryVersion>('__tiptapcollab__versions').observe(callback)
  }

  unwatchVersions(callback: Parameters<AbstractType<YArrayEvent<THistoryVersion>>['unobserve']>[0]) {
    return this.configuration.document.getArray<THistoryVersion>('__tiptapcollab__versions').unobserve(callback)
  }

  isAutoVersioning(): boolean {
    return !!this.configuration.document.getMap<number>(`${this.tiptapCollabConfigurationPrefix}config`).get('autoVersioning')
  }

  enableAutoVersioning() {
    return this.configuration.document.getMap<number>(`${this.tiptapCollabConfigurationPrefix}config`).set('autoVersioning', 1)
  }

  disableAutoVersioning() {
    return this.configuration.document.getMap<number>(`${this.tiptapCollabConfigurationPrefix}config`).set('autoVersioning', 0)
  }

}
