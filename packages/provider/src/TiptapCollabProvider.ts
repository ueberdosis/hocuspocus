import type { AbstractType, YArrayEvent } from 'yjs'
import * as Y from 'yjs'
import { uuidv4 } from 'lib0/random'
import {
  HocuspocusProvider,
  HocuspocusProviderConfiguration,
} from './HocuspocusProvider.js'

import { TiptapCollabProviderWebsocket } from './TiptapCollabProviderWebsocket.js'
import {
  type DeleteCommentOptions,
  type DeleteThreadOptions,
  type GetThreadsOptions,
  type TCollabComment, type TCollabThread, type THistoryVersion,
} from './types.js'

const defaultDeleteCommentOptions: DeleteCommentOptions = {
  deleteContent: false,
  deleteThread: false,
}

const defaultGetThreadsOptions: GetThreadsOptions = {
  types: ['unarchived'],
}

const defaultDeleteThreadOptions: DeleteThreadOptions = {
  deleteComments: false,
  force: false,
}

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
   * @options Options to control the output of the threads (e.g. include deleted threads)
   * @returns An array of threads as JSON objects
   */
  getThreads<Data, CommentData>(options?: GetThreadsOptions): TCollabThread<Data, CommentData>[] {
    const { types } = { ...defaultGetThreadsOptions, ...options } as GetThreadsOptions

    const threads = this.getYThreads().toJSON() as TCollabThread<Data, CommentData>[]

    if (types?.includes('archived') && types?.includes('unarchived')) {
      return threads
    }

    return threads.filter(currentThead => {
      if (types?.includes('archived') && currentThead.deletedAt) {
        return true
      }

      if (types?.includes('unarchived') && !currentThead.deletedAt) {
        return true
      }

      return false
    })
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
    for (const thread of this.getThreads({ types: ['archived', 'unarchived'] })) {
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
  createThread(data: Omit<TCollabThread, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'comments' | 'deletedComments'>) {
    let createdThread: TCollabThread = {} as TCollabThread

    this.document.transact(() => {
      const thread = new Y.Map()
      thread.set('id', uuidv4())
      thread.set('createdAt', (new Date()).toISOString())
      thread.set('comments', new Y.Array())
      thread.set('deletedComments', new Y.Array())
      thread.set('deletedAt', null)

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
   * Handle the deletion of a thread. By default, the thread and it's comments are not deleted, but marked as deleted
   * via the `deletedAt` property. Forceful deletion can be enabled by setting the `force` option to `true`.
   *
   * If you only want to delete the comments of a thread, you can set the `deleteComments` option to `true`.
   * @param id The thread id
   * @param options A set of options that control how the thread is deleted
   * @returns The deleted thread or null if the thread is not found
   */
  deleteThread(id: TCollabThread['id'], options?: DeleteThreadOptions) {
    const { deleteComments, force } = { ...defaultDeleteThreadOptions, ...options }

    const index = this.getThreadIndex(id)

    if (index === null) {
      return null
    }

    if (force) {
      this.getYThreads().delete(index, 1)
      return
    }

    const thread = this.getYThreads().get(index)

    thread.set('deletedAt', (new Date()).toISOString())

    if (deleteComments) {
      thread.set('comments', new Y.Array())
      thread.set('deletedComments', new Y.Array())
    }

    return thread.toJSON() as TCollabThread
  }

  /**
   * Tries to restore a deleted thread
   * @param id The thread id
   * @returns The restored thread or null if the thread is not found
   */
  restoreThread(id: TCollabThread['id']) {
    const index = this.getThreadIndex(id)

    if (index === null) {
      return null
    }

    const thread = this.getYThreads().get(index)

    thread.set('deletedAt', null)

    return thread.toJSON() as TCollabThread
  }

  /**
   * Returns comments from a thread, either deleted or not
   * @param threadId The thread id
   * @param includeDeleted If you want to include deleted comments, defaults to `false`
   * @returns The comments or null if the thread is not found
   */
  getThreadComments(threadId: TCollabThread['id'], includeDeleted?: boolean): TCollabComment[] | null {
    const index = this.getThreadIndex(threadId)

    if (index === null) {
      return null
    }

    const comments = !includeDeleted ? this.getThread(threadId)?.comments : [...(this.getThread(threadId)?.comments || []), ...(this.getThread(threadId)?.deletedComments || [])].sort((a, b) => {
      return a.createdAt.localeCompare(b.createdAt)
    })

    return comments ?? []
  }

  /**
   * Get a single comment from a specific thread
   * @param threadId The thread id
   * @param commentId The comment id
   * @param includeDeleted If you want to include deleted comments in the search
   * @returns The comment or null if not found
   */
  getThreadComment(threadId: TCollabThread['id'], commentId: TCollabComment['id'], includeDeleted?: boolean): TCollabComment | null {
    const index = this.getThreadIndex(threadId)

    if (index === null) {
      return null
    }

    const comments = this.getThreadComments(threadId, includeDeleted)

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
   * @param options A set of options that control how the comment is deleted
   * @returns The updated thread or null if the thread or comment is not found
   */
  deleteComment(threadId: TCollabThread['id'], commentId: TCollabComment['id'], options?: DeleteCommentOptions) {
    const { deleteContent, deleteThread } = { ...defaultDeleteCommentOptions, ...options }

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
    newComment.set('content', deleteContent ? null : comment.get('content'))

    if (!thread.get('deletedComments')) {
      thread.set('deletedComments', new Y.Array())
    }
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
