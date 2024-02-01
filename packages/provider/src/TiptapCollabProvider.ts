import type { AbstractType, YArrayEvent } from 'yjs'
import * as Y from 'yjs'
import { uuidv4 } from 'lib0/random'
import {
  HocuspocusProvider,
  HocuspocusProviderConfiguration,
} from './HocuspocusProvider.js'

import { TiptapCollabProviderWebsocket } from './TiptapCollabProviderWebsocket.js'
import type {
  TCollabComment, TCollabThread, THistoryVersion,
} from './types.js'

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

  private getYThreads() {
    return this.configuration.document.getArray<Y.Map<any>>(`${this.tiptapCollabConfigurationPrefix}threads`)
  }

  getThreads<Data, CommentData>(): TCollabThread<Data, CommentData>[] {
    return this.getYThreads().toJSON() as TCollabThread<Data, CommentData>[]
  }

  private getThreadIndex(id: string): number | null {
    let index = null

    let i = 0
    // eslint-disable-next-line no-restricted-syntax
    for (const thread of this.getThreads()) {
      if (thread.id === id) {
        index = i
        break
      }
      i += 1
    }

    return index
  }

  getThread<Data, CommentData>(id: string): TCollabThread<Data, CommentData> | null {
    const index = this.getThreadIndex(id)

    if (index === null) {
      return null
    }

    return this.getYThreads().get(index).toJSON() as TCollabThread<Data, CommentData>
  }

  private getYThread(id: string) {
    const index = this.getThreadIndex(id)

    if (index === null) {
      return null
    }

    return this.getYThreads().get(index)
  }

  createThread(data: Omit<TCollabThread, 'id' | 'createdAt' | 'updatedAt' | 'comments'>) {
    const thread = new Y.Map()
    thread.set('id', uuidv4())
    thread.set('createdAt', (new Date()).toISOString())
    thread.set('comments', new Y.Array())

    this.getYThreads().push([thread])
    return this.updateThread(String(thread.get('id')), data)
  }

  updateThread(id: TCollabThread['id'], data: Partial<Pick<TCollabThread, 'data' | 'resolvedAt'>>) {
    const thread = this.getYThread(id)

    if (thread === null) {
      return null
    }

    thread.set('updatedAt', (new Date()).toISOString())

    if (data.data) {
      thread.set('data', data.data)
    }

    if (data.resolvedAt || data.resolvedAt === null) {
      thread.set('resolvedAt', data.resolvedAt)
    }

    return thread.toJSON() as TCollabThread
  }

  deleteThread(id: TCollabThread['id']) {
    const index = this.getThreadIndex(id)

    if (index === null) {
      return
    }

    this.getYThreads().delete(index, 1)
  }

  getThreadComments(threadId: TCollabThread['id']): TCollabComment[] | null {
    const index = this.getThreadIndex(threadId)

    if (index === null) {
      return null
    }

    return this.getThread(threadId)?.comments ?? []
  }

  getThreadComment(threadId: TCollabThread['id'], commentId: TCollabComment['id']): TCollabComment | null {
    const index = this.getThreadIndex(threadId)

    if (index === null) {
      return null
    }

    return this.getThread(threadId)?.comments.find(comment => comment.id === commentId) ?? null
  }

  addComment(threadId: TCollabThread['id'], data: Omit<TCollabComment, 'id' | 'updatedAt' | 'createdAt'>) {
    const thread = this.getYThread(threadId)

    if (thread === null) return null

    const commentMap = new Y.Map()
    commentMap.set('id', uuidv4())
    commentMap.set('createdAt', (new Date()).toISOString())
    thread.get('comments').push([commentMap])

    this.updateComment(threadId, String(commentMap.get('id')), data)

    return thread.toJSON() as TCollabThread
  }

  updateComment(threadId: TCollabThread['id'], commentId: TCollabComment['id'], data: Partial<Pick<TCollabComment, 'data' | 'content'>>) {
    const thread = this.getYThread(threadId)

    if (thread === null) return null

    let comment = null
    // eslint-disable-next-line no-restricted-syntax
    for (const c of thread.get('comments')) {
      if (c.get('id') === commentId) {
        comment = c
        break
      }
    }

    if (comment === null) return null

    comment.set('updatedAt', (new Date()).toISOString())

    if (data.data) {
      comment.set('data', data.data)
    }

    if (data.content) {
      comment.set('content', data.content)
    }

    return thread.toJSON() as TCollabThread
  }

  deleteComment(threadId: TCollabThread['id'], commentId: TCollabComment['id']) {
    const thread = this.getYThread(threadId)

    if (thread === null) return null

    let commentIndex = 0
    // eslint-disable-next-line no-restricted-syntax
    for (const c of thread.get('comments')) {
      if (c.get('id') === commentId) {
        break
      }
      commentIndex += 1
    }

    if (commentIndex >= 0) {
      thread.get('comments').delete(commentIndex)
    }

    return thread.toJSON() as TCollabThread
  }

  watchThreads(callback: () => void) {
    this.getYThreads().observeDeep(callback)
  }

  unwatchThreads(callback: () => void) {
    this.getYThreads().unobserveDeep(callback)
  }

}
