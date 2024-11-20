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
  Required<Pick<AdditionalTiptapCollabProviderConfiguration, 'baseUrl'>>) &
  Pick<AdditionalTiptapCollabProviderConfiguration, 'user'> & {
    /**
     * Pass `true` if you want to delete a thread when the first comment is deleted.
     */
    deleteThreadOnFirstCommentDelete?: boolean,
  }

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

  user?: string
}

export class TiptapCollabProvider extends HocuspocusProvider {
  tiptapCollabConfigurationPrefix = '__tiptapcollab__'

  userData?: Y.PermanentUserData

  constructor(configuration: TiptapCollabProviderConfiguration) {
    if (!configuration.websocketProvider) {
      configuration.websocketProvider = new TiptapCollabProviderWebsocket({ appId: (configuration as Required<Pick<AdditionalTiptapCollabProviderConfiguration, 'appId'>>).appId, baseUrl: (configuration as Required<Pick<AdditionalTiptapCollabProviderConfiguration, 'baseUrl'>>).baseUrl })
    }

    if (!configuration.token) {
      configuration.token = 'notoken' // need to send a token anyway (which will be ignored)
    }

    super(configuration as HocuspocusProviderConfiguration)

    if (configuration.user) {
      this.userData = new Y.PermanentUserData(this.document, this.document.getMap('__tiptapcollab__users'))
      this.userData.setUserMapping(this.document, this.document.clientID, configuration.user)
    }
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

  /**
   * Returns all users in the document as Y.Map objects
   * @returns An array of Y.Map objects
   */
  private getYThreads() {
    return this.configuration.document.getArray<Y.Map<any>>(`${this.tiptapCollabConfigurationPrefix}threads`)
  }

  /**
   * Finds all threads in the document and returns them as JSON objects
   * @returns An array of threads as JSON objects
   */
  getThreads<Data, CommentData>(): TCollabThread<Data, CommentData>[] {
    return this.getYThreads().toJSON() as TCollabThread<Data, CommentData>[]
  }

  /**
   * Find the index of a thread by its id
   * @param id The thread id
   * @returns The index of the thread or null if not found
   */
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

  /**
   * Gets a single thread by its id
   * @param id The thread id
   * @returns The thread as a JSON object or null if not found
   */
  getThread<Data, CommentData>(id: string): TCollabThread<Data, CommentData> | null {
    const index = this.getThreadIndex(id)

    if (index === null) {
      return null
    }

    return this.getYThreads().get(index).toJSON() as TCollabThread<Data, CommentData>
  }

  /**
   * Gets a single thread by its id as a Y.Map object
   * @param id The thread id
   * @returns The thread as a Y.Map object or null if not found
   */
  private getYThread(id: string) {
    const index = this.getThreadIndex(id)

    if (index === null) {
      return null
    }

    return this.getYThreads().get(index)
  }

  /**
   * Create a new thread
   * @param data The thread data
   * @returns The created thread
   */
  createThread(data: Omit<TCollabThread, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'deletedComments'>) {
    let createdThread: TCollabThread = {} as TCollabThread

    this.document.transact(() => {
      const thread = new Y.Map()
      thread.set('id', uuidv4())
      thread.set('createdAt', (new Date()).toISOString())
      thread.set('comments', new Y.Array())
      thread.set('deletedComments', new Y.Array())

      this.getYThreads().push([thread])
      createdThread = this.updateThread(String(thread.get('id')), data)
    })

    return createdThread
  }

  /**
   * Update a specific thread
   * @param id The thread id
   * @param data New data for the thread
   * @returns The updated thread or null if the thread is not found
   */
  updateThread(id: TCollabThread['id'], data: Partial<Pick<TCollabThread, 'data'> & {
    resolvedAt: TCollabThread['resolvedAt'] | null
  }>) {
    let updatedThread: TCollabThread = {} as TCollabThread

    this.document.transact(() => {
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

      updatedThread = thread.toJSON() as TCollabThread
    })

    return updatedThread
  }

  /**
   * Delete a specific thread and all its comments
   * @param id The thread id
   * @returns void
   */
  deleteThread(id: TCollabThread['id']) {
    const index = this.getThreadIndex(id)

    if (index === null) {
      return
    }

    this.getYThreads().delete(index, 1)
  }

  /**
   * Returns comments from a thread, either deleted or not
   * @param threadId The thread id
   * @param deleted If you want to query deleted comments, defaults to `false`
   * @returns The comments or null if the thread is not found
   */
  getThreadComments(threadId: TCollabThread['id'], deleted?: boolean): TCollabComment[] | null {
    const index = this.getThreadIndex(threadId)

    if (index === null) {
      return null
    }

    return (!deleted ? this.getThread(threadId)?.comments : this.getThread(threadId)?.deletedComments) ?? []
  }

  /**
   * Returns all comments of a thread **including deleted ones**
   * @param threadId The thread id
   * @returns The comments or null if the thread is not found
   */
  getAllThreadComments(threadId: TCollabThread['id']): TCollabComment[] | null {
    const index = this.getThreadIndex(threadId)

    if (index === null) {
      return null
    }

    return [...this.getThreadComments(threadId) ?? [], ...this.getThreadComments(threadId, true) ?? []].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  /**
   * Get a single comment from a specific thread
   * @param threadId The thread id
   * @param commentId The comment id
   * @param deleted If you want to include deleted comments in the search
   * @returns The comment or null if not found
   */
  getThreadComment(threadId: TCollabThread['id'], commentId: TCollabComment['id'], deleted?: boolean): TCollabComment | null {
    const index = this.getThreadIndex(threadId)

    if (index === null) {
      return null
    }

    const comments = deleted ? this.getAllThreadComments(threadId) : this.getThreadComments(threadId)

    return comments?.find(comment => comment.id === commentId) ?? null
  }

  /**
   * Adds a comment to a thread
   * @param threadId The thread id
   * @param data The comment data
   * @returns The updated thread or null if the thread is not found
   * @example addComment('123', { content: 'Hello world', data: { author: 'Maria Doe' } })
   */
  addComment(threadId: TCollabThread['id'], data: Omit<TCollabComment, 'id' | 'updatedAt' | 'createdAt'>) {
    let updatedThread: TCollabThread = {} as TCollabThread

    this.document.transact(() => {
      const thread = this.getYThread(threadId)

      if (thread === null) return null

      const commentMap = new Y.Map()
      commentMap.set('id', uuidv4())
      commentMap.set('createdAt', (new Date()).toISOString())
      thread.get('comments').push([commentMap])

      this.updateComment(threadId, String(commentMap.get('id')), data)

      updatedThread = thread.toJSON() as TCollabThread
    })

    return updatedThread
  }

  /**
   * Update a comment in a thread
   * @param threadId The thread id
   * @param commentId The comment id
   * @param data The new comment data
   * @returns The updated thread or null if the thread or comment is not found
   * @example updateComment('123', { content: 'The new content', data: { attachments: ['file1.jpg'] }})
   */
  updateComment(threadId: TCollabThread['id'], commentId: TCollabComment['id'], data: Partial<Pick<TCollabComment, 'data' | 'content'>>) {
    let updatedThread: TCollabThread = {} as TCollabThread

    this.document.transact(() => {
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

      updatedThread = thread.toJSON() as TCollabThread
    })

    return updatedThread
  }

  /**
   * Deletes a comment from a thread
   * @param threadId The thread id
   * @param commentId The comment id
   * @param deleteThread Set to `true` if you also want to delete the thread when the last comment is deleted
   * @returns The updated thread or null if the thread or comment is not found
   */
  deleteComment(threadId: TCollabThread['id'], commentId: TCollabComment['id'], deleteThread?: boolean) {
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

    // if the first comment of a thread is deleted we also
    // delete the thread itself as the source comment is gone
    if (commentIndex === 0 && (deleteThread || (this.configuration as TiptapCollabProviderConfiguration).deleteThreadOnFirstCommentDelete)) {
      this.deleteThread(threadId)
      return
    }

    const comment = thread.get('comments').get(commentIndex)
    const newComment = new Y.Map()

    newComment.set('id', comment.get('id'))
    newComment.set('createdAt', comment.get('createdAt'))
    newComment.set('updatedAt', (new Date()).toISOString())
    newComment.set('deletedAt', (new Date()).toISOString())
    newComment.set('data', comment.get('data'))
    newComment.set('content', comment.get('content'))

    thread.get('deletedComments').push([newComment])
    thread.get('comments').delete(commentIndex)

    return thread.toJSON() as TCollabThread
  }

  /**
   * Start watching threads for changes
   * @param callback The callback function to be called when a thread changes
   */
  watchThreads(callback: () => void) {
    this.getYThreads().observeDeep(callback)
  }

  /**
   * Stop watching threads for changes
   * @param callback The callback function to be removed
   */
  unwatchThreads(callback: () => void) {
    this.getYThreads().unobserveDeep(callback)
  }

}
