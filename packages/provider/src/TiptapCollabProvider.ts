import type { AbstractType, YArrayEvent } from 'yjs'
import * as Y from 'yjs'
import {
  HocuspocusProvider,
  HocuspocusProviderConfiguration,
} from './HocuspocusProvider.js'

import { TiptapCollabProviderWebsocket } from './TiptapCollabProviderWebsocket.js'
import type {
  TCollabComment, TCollabThread, THistoryVersion,
} from './types.js'
import { CollabThread, CollabThreadOptions } from './tiptapCollab/CollabThread.js'

export type TiptapCollabProviderConfiguration =
  Required<Pick<HocuspocusProviderConfiguration, 'name'>> &
  Partial<HocuspocusProviderConfiguration> &
  (Required<Pick<AdditionalTiptapCollabProviderConfiguration, 'websocketProvider'>> |
  Required<Pick<AdditionalTiptapCollabProviderConfiguration, 'appId'>>|
  Required<Pick<AdditionalTiptapCollabProviderConfiguration, 'baseUrl'>>)

export interface AdditionalTiptapCollabProviderConfiguration {
  /**
   * A Hocuspocus Cloud App ID, get one here: https://cloud.tiptap.dev
   */
  appId?: string,

  /**
   * If you are using the on-premise version of TiptapCollab, put your baseUrl here (e.g. https://collab.yourdomain.com)
   */
  baseUrl?: string

  websocketProvider?: TiptapCollabProviderWebsocket
}

export class TiptapCollabProvider extends HocuspocusProvider {
  tiptapCollabConfigurationPrefix = '__tiptapcollab__'

  constructor(configuration: TiptapCollabProviderConfiguration) {
    if (!configuration.websocketProvider) {
      configuration.websocketProvider = new TiptapCollabProviderWebsocket({ appId: (configuration as Required<Pick<AdditionalTiptapCollabProviderConfiguration, 'appId'>>).appId, baseUrl: (configuration as Required<Pick<AdditionalTiptapCollabProviderConfiguration, 'baseUrl'>>).baseUrl })
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

  get threads() {
    return this.configuration.document.getArray<Y.Map<any>>(`${this.tiptapCollabConfigurationPrefix}threads`)
  }

  getThreadIndex(id: string) {
    let index = -1

    this.threads.forEach((threadMap, i) => {
      const thread = CollabThread.fromMap(threadMap)

      if (thread.id === id) {
        index = i
      }
    })

    return index
  }

  getThread(id: string) {
    const index = this.getThreadIndex(id)

    if (!index) {
      return
    }

    return this.threads.get(index)
  }

  createThread(thread: CollabThread) {
    this.threads.push([thread.map])
  }

  updateThread(id: CollabThread['id'], data: Omit<Partial<CollabThreadOptions>, 'id'>) {
    const index = this.getThreadIndex(id)

    if (index === -1) {
      return
    }

    const thread = CollabThread.fromMap(this.threads.get(index))
    thread.update(data)

    this.threads.delete(index, 1)
    this.threads.insert(index, [thread.map])
  }

  deleteThread(id: TCollabThread['id']) {
    const index = this.getThreadIndex(id)

    if (index === -1) {
      return
    }

    this.threads.delete(index, 1)
  }

  getThreadComments(threadId: TCollabThread['id']): TCollabComment[] | undefined {
    const index = this.getThreadIndex(threadId)

    if (index === -1) {
      return
    }

    const thread = CollabThread.fromMap(this.threads.get(index))

    return thread.comments
  }

  getThreadComment(threadId: TCollabThread['id'], commentId: TCollabComment['id']): TCollabComment | undefined {
    const index = this.getThreadIndex(threadId)

    if (index === -1) {
      return
    }

    const thread = CollabThread.fromMap(this.threads.get(index))

    return thread.comments.find(comment => comment.id === commentId)
  }
}
