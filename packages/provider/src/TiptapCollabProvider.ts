import type { AbstractType, YArrayEvent } from 'yjs'
import {
  HocuspocusProvider,
  HocuspocusProviderConfiguration,
} from './HocuspocusProvider.js'

import { TiptapCollabProviderWebsocket } from './TiptapCollabProviderWebsocket.js'

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

export type AuditHistoryVersion = {
  name?: string;
  version: number;
  date: number;
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

  createVersion(name?: string) {
    console.error('This doesnt work yet! If you want to join as a beta tester, send an email to humans@tiptap.dev')
    return this.sendStateless(JSON.stringify({ action: 'version.create', name }))
  }

  revertToVersion(targetVersion: number) {
    console.error('This doesnt work yet! If you want to join as a beta tester, send an email to humans@tiptap.dev')
    return this.sendStateless(JSON.stringify({ action: 'version.revert', version: targetVersion }))
  }

  getVersions(): AuditHistoryVersion[] {
    console.error('This doesnt work yet! If you want to join as a beta tester, send an email to humans@tiptap.dev')
    return this.configuration.document.getArray<AuditHistoryVersion>(`${this.tiptapCollabConfigurationPrefix}versions`).toArray()
  }

  watchVersions(callback: Parameters<AbstractType<YArrayEvent<AuditHistoryVersion>>['observe']>[0]) {
    console.error('This doesnt work yet! If you want to join as a beta tester, send an email to humans@tiptap.dev')
    return this.configuration.document.getArray<AuditHistoryVersion>('__tiptapcollab__versions').observe(callback)
  }

  unwatchVersions(callback: Parameters<AbstractType<YArrayEvent<AuditHistoryVersion>>['unobserve']>[0]) {
    console.error('This doesnt work yet! If you want to join as a beta tester, send an email to humans@tiptap.dev')
    return this.configuration.document.getArray<AuditHistoryVersion>('__tiptapcollab__versions').unobserve(callback)
  }

  isAutoVersioning(): boolean {
    console.error('This doesnt work yet! If you want to join as a beta tester, send an email to humans@tiptap.dev')
    return !!this.configuration.document.getMap<number>(`${this.tiptapCollabConfigurationPrefix}config`).get('autoVersioning')
  }

  enableAutoVersioning() {
    console.error('This doesnt work yet! If you want to join as a beta tester, send an email to humans@tiptap.dev')
    return this.configuration.document.getMap<number>(`${this.tiptapCollabConfigurationPrefix}config`).set('autoVersioning', 1)
  }

  disableAutoVersioning() {
    console.error('This doesnt work yet! If you want to join as a beta tester, send an email to humans@tiptap.dev')
    return this.configuration.document.getMap<number>(`${this.tiptapCollabConfigurationPrefix}config`).set('autoVersioning', 0)
  }

}
