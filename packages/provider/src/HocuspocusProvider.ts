import { awarenessStatesToArray } from '@hocuspocus/common'
import * as bc from 'lib0/broadcastchannel'
import * as mutex from 'lib0/mutex'
import type { CloseEvent, Event, MessageEvent } from 'ws'
import { Awareness, removeAwarenessStates } from 'y-protocols/awareness'
import * as Y from 'yjs'
import EventEmitter from './EventEmitter.js'
import {
  CompleteHocuspocusProviderWebsocketConfiguration,
  HocuspocusProviderWebsocket,
} from './HocuspocusProviderWebsocket.js'
import { IncomingMessage } from './IncomingMessage.js'
import { MessageReceiver } from './MessageReceiver.js'
import { MessageSender } from './MessageSender.js'
import { AuthenticationMessage } from './OutgoingMessages/AuthenticationMessage.js'
import { AwarenessMessage } from './OutgoingMessages/AwarenessMessage.js'
import { CloseMessage } from './OutgoingMessages/CloseMessage.js'
import { QueryAwarenessMessage } from './OutgoingMessages/QueryAwarenessMessage.js'
import { StatelessMessage } from './OutgoingMessages/StatelessMessage.js'
import { SyncStepOneMessage } from './OutgoingMessages/SyncStepOneMessage.js'
import { SyncStepTwoMessage } from './OutgoingMessages/SyncStepTwoMessage.js'
import { UpdateMessage } from './OutgoingMessages/UpdateMessage.js'
import {
  ConstructableOutgoingMessage,
  WebSocketStatus,
  onAuthenticationFailedParameters,
  onAwarenessChangeParameters,
  onAwarenessUpdateParameters,
  onCloseParameters,
  onDisconnectParameters,
  onMessageParameters,
  onOpenParameters,
  onOutgoingMessageParameters, onStatelessParameters,
  onStatusParameters,
  onSyncedParameters,
} from './types.js'

export type HocuspocusProviderConfiguration =
  Required<Pick<CompleteHocuspocusProviderConfiguration, 'name'>>
    & Partial<CompleteHocuspocusProviderConfiguration> & (
  Required<Pick<CompleteHocuspocusProviderWebsocketConfiguration, 'url'>> |
  Required<Pick<CompleteHocuspocusProviderConfiguration, 'websocketProvider'>>
  )

export interface CompleteHocuspocusProviderConfiguration {
  /**
  * The identifier/name of your document
  */
   name: string,
  /**
   * The actual Y.js document
   */
  document: Y.Doc,

  /**
   * Pass false to disable broadcasting between browser tabs.
   */
  broadcast: boolean,
  /**
   * An Awareness instance to keep the presence state of all clients.
   *
   * You can disable sharing awareness information by passing `null`.
   * Note that having no awareness information shared across all connections will break our ping checks
   * and thus trigger reconnects. You should always have at least one Provider with enabled awareness per
   * socket connection, or ensure that the Provider receives messages before running into `HocuspocusProviderWebsocket.messageReconnectTimeout`.
   */
  awareness: Awareness | null,
  /**
   * A token that’s sent to the backend for authentication purposes.
   */
  token: string | (() => string) | (() => Promise<string>) | null,
  /**
   * URL parameters that should be added.
   */
  parameters: { [key: string]: any },
  /**
   * Hocuspocus websocket provider
   */
  websocketProvider: HocuspocusProviderWebsocket,
  /**
   * Force syncing the document in the defined interval.
   */
  forceSyncInterval: false | number,

  onAuthenticated: () => void,
  onAuthenticationFailed: (data: onAuthenticationFailedParameters) => void,
  onOpen: (data: onOpenParameters) => void,
  onConnect: () => void,
  onMessage: (data: onMessageParameters) => void,
  onOutgoingMessage: (data: onOutgoingMessageParameters) => void,
  onStatus: (data: onStatusParameters) => void,
  onSynced: (data: onSyncedParameters) => void,
  onDisconnect: (data: onDisconnectParameters) => void,
  onClose: (data: onCloseParameters) => void,
  onDestroy: () => void,
  onAwarenessUpdate: (data: onAwarenessUpdateParameters) => void,
  onAwarenessChange: (data: onAwarenessChangeParameters) => void,
  onStateless: (data: onStatelessParameters) => void

  /**
   * Don’t output any warnings.
   */
  quiet: boolean,

  /**
   * Pass `false` to start the connection manually.
   */
  connect: boolean,

  /**
   * Pass `false` to close the connection manually.
   */
  preserveConnection: boolean,
}

export class AwarenessError extends Error {
  code = 1001
}

export class HocuspocusProvider extends EventEmitter {
  public configuration: CompleteHocuspocusProviderConfiguration = {
    name: '',
    // @ts-ignore
    document: undefined,
    // @ts-ignore
    awareness: undefined,
    token: null,
    parameters: {},
    broadcast: true,
    forceSyncInterval: false,
    onAuthenticated: () => null,
    onAuthenticationFailed: () => null,
    onOpen: () => null,
    onConnect: () => null,
    onMessage: () => null,
    onOutgoingMessage: () => null,
    onStatus: () => null,
    onSynced: () => null,
    onDisconnect: () => null,
    onClose: () => null,
    onDestroy: () => null,
    onAwarenessUpdate: () => null,
    onAwarenessChange: () => null,
    onStateless: () => null,
    quiet: false,
    connect: true,
    preserveConnection: true,
  }

  subscribedToBroadcastChannel = false

  isSynced = false

  unsyncedChanges = 0

  status = WebSocketStatus.Disconnected

  isAuthenticated = false

  authorizedScope: string | undefined = undefined

  mux = mutex.createMutex()

  intervals: any = {
    forceSync: null,
  }

  isConnected = true

  constructor(configuration: HocuspocusProviderConfiguration) {
    super()
    this.setConfiguration(configuration)

    this.configuration.document = configuration.document ? configuration.document : new Y.Doc()
    this.configuration.awareness = configuration.awareness !== undefined ? configuration.awareness : new Awareness(this.document)

    this.on('open', this.configuration.onOpen)
    this.on('message', this.configuration.onMessage)
    this.on('outgoingMessage', this.configuration.onOutgoingMessage)
    this.on('synced', this.configuration.onSynced)
    this.on('destroy', this.configuration.onDestroy)
    this.on('awarenessUpdate', this.configuration.onAwarenessUpdate)
    this.on('awarenessChange', this.configuration.onAwarenessChange)
    this.on('stateless', this.configuration.onStateless)

    this.on('authenticated', this.configuration.onAuthenticated)
    this.on('authenticationFailed', this.configuration.onAuthenticationFailed)

    this.configuration.websocketProvider.on('connect', this.configuration.onConnect)
    this.configuration.websocketProvider.on('connect', this.forwardConnect)

    this.configuration.websocketProvider.on('open', this.boundOnOpen)
    this.configuration.websocketProvider.on('open', this.forwardOpen)

    this.configuration.websocketProvider.on('close', this.boundOnClose)
    this.configuration.websocketProvider.on('close', this.configuration.onClose)
    this.configuration.websocketProvider.on('close', this.forwardClose)

    this.configuration.websocketProvider.on('status', this.boundOnStatus)

    this.configuration.websocketProvider.on('disconnect', this.configuration.onDisconnect)
    this.configuration.websocketProvider.on('disconnect', this.forwardDisconnect)

    this.configuration.websocketProvider.on('destroy', this.configuration.onDestroy)
    this.configuration.websocketProvider.on('destroy', this.forwardDestroy)

    this.awareness?.on('update', () => {
      this.emit('awarenessUpdate', { states: awarenessStatesToArray(this.awareness!.getStates()) })
    })

    this.awareness?.on('change', () => {
      this.emit('awarenessChange', { states: awarenessStatesToArray(this.awareness!.getStates()) })
    })

    this.document.on('update', this.boundDocumentUpdateHandler)
    this.awareness?.on('update', this.boundAwarenessUpdateHandler)
    this.registerEventListeners()

    if (
      this.configuration.forceSyncInterval
      && typeof this.configuration.forceSyncInterval === 'number'
    ) {
      this.intervals.forceSync = setInterval(
        this.forceSync.bind(this),
        this.configuration.forceSyncInterval,
      )
    }

    this.configuration.websocketProvider.attach(this)
  }

  boundDocumentUpdateHandler = this.documentUpdateHandler.bind(this)

  boundAwarenessUpdateHandler = this.awarenessUpdateHandler.bind(this)

  boundBroadcastChannelSubscriber = this.broadcastChannelSubscriber.bind(this)

  boundPageHide = this.pageHide.bind(this)

  boundOnOpen = this.onOpen.bind(this)

  boundOnClose = this.onClose.bind(this)

  boundOnStatus = this.onStatus.bind(this)

  forwardConnect = (e: any) => this.emit('connect', e)

  forwardOpen = (e: any) => this.emit('open', e)

  forwardClose = (e: any) => this.emit('close', e)

  forwardDisconnect = (e: any) => this.emit('disconnect', e)

  forwardDestroy = (e: any) => this.emit('destroy', e)

  public onStatus({ status } : onStatusParameters) {
    this.status = status

    this.configuration.onStatus({ status })
    this.emit('status', { status })
  }

  public setConfiguration(configuration: Partial<HocuspocusProviderConfiguration> = {}): void {
    if (!configuration.websocketProvider && (configuration as CompleteHocuspocusProviderWebsocketConfiguration).url) {
      const websocketProviderConfig = configuration as CompleteHocuspocusProviderWebsocketConfiguration

      this.configuration.websocketProvider = new HocuspocusProviderWebsocket({
        url: websocketProviderConfig.url,
        connect: websocketProviderConfig.connect,
        parameters: websocketProviderConfig.parameters,
      })
    }

    this.configuration = { ...this.configuration, ...configuration }
  }

  get document() {
    return this.configuration.document
  }

  get awareness() {
    return this.configuration.awareness
  }

  get hasUnsyncedChanges(): boolean {
    return this.unsyncedChanges > 0
  }

  private resetUnsyncedChanges() {
    this.unsyncedChanges = 1
    this.emit('unsyncedChanges', this.unsyncedChanges)
  }

  incrementUnsyncedChanges() {
    this.unsyncedChanges += 1
    this.emit('unsyncedChanges', this.unsyncedChanges)
  }

  decrementUnsyncedChanges() {
    this.unsyncedChanges -= 1
    if (this.unsyncedChanges === 0) {
      this.synced = true
    }
    this.emit('unsyncedChanges', this.unsyncedChanges)
  }

  forceSync() {
    this.resetUnsyncedChanges()

    this.send(SyncStepOneMessage, { document: this.document, documentName: this.configuration.name })
  }

  pageHide() {
    if (this.awareness) {
      removeAwarenessStates(this.awareness, [this.document.clientID], 'page hide')
    }
  }

  registerEventListeners() {
    if (typeof window === 'undefined' || !('addEventListener' in window)) {
      return
    }

    window.addEventListener('pagehide', this.boundPageHide)
  }

  sendStateless(payload: string) {
    this.send(StatelessMessage, { documentName: this.configuration.name, payload })
  }

  documentUpdateHandler(update: Uint8Array, origin: any) {
    if (origin === this) {
      return
    }

    this.incrementUnsyncedChanges()
    this.send(UpdateMessage, { update, documentName: this.configuration.name }, true)
  }

  awarenessUpdateHandler({ added, updated, removed }: any, origin: any) {
    const changedClients = added.concat(updated).concat(removed)

    this.send(AwarenessMessage, {
      awareness: this.awareness,
      clients: changedClients,
      documentName: this.configuration.name,
    }, true)
  }

  /**
   * Indicates whether a first handshake with the server has been established
   *
   * Note: this does not mean all updates from the client have been persisted to the backend. For this,
   * use `hasUnsyncedChanges`.
   */
  get synced(): boolean {
    return this.isSynced
  }

  set synced(state) {
    if (this.isSynced === state) {
      return
    }

    this.isSynced = state
    this.emit('synced', { state })
    this.emit('sync', { state })
  }

  receiveStateless(payload: string) {
    this.emit('stateless', { payload })
  }

  get isAuthenticationRequired(): boolean {
    return !!this.configuration.token && !this.isAuthenticated
  }

  // not needed, but provides backward compatibility with e.g. lexical/yjs
  async connect() {
    if (this.configuration.broadcast) {
      this.subscribeToBroadcastChannel()
    }

    this.configuration.websocketProvider.shouldConnect = true

    return this.configuration.websocketProvider.attach(this)
  }

  disconnect() {
    this.disconnectBroadcastChannel()
    this.configuration.websocketProvider.detach(this)
    this.isConnected = false

    if (!this.configuration.preserveConnection) {
      this.configuration.websocketProvider.disconnect()
    }

  }

  async onOpen(event: Event) {
    this.isAuthenticated = false
    this.isConnected = true

    this.emit('open', { event })

    let token: string | null
    try {
      token = await this.getToken()
    } catch (error) {
      this.permissionDeniedHandler(`Failed to get token: ${error}`)
      return
    }

    if (this.isAuthenticationRequired) {
      this.send(AuthenticationMessage, {
        token,
        documentName: this.configuration.name,
      })
    }

    this.startSync()
  }

  async getToken() {
    if (typeof this.configuration.token === 'function') {
      const token = await this.configuration.token()
      return token
    }

    return this.configuration.token
  }

  startSync() {
    this.resetUnsyncedChanges()

    this.send(SyncStepOneMessage, { document: this.document, documentName: this.configuration.name })

    if (this.awareness && this.awareness.getLocalState() !== null) {
      this.send(AwarenessMessage, {
        awareness: this.awareness,
        clients: [this.document.clientID],
        documentName: this.configuration.name,
      })
    }
  }

  send(message: ConstructableOutgoingMessage, args: any, broadcast = false) {
    if (!this.isConnected) {
      return
    }

    if (broadcast) {
      this.mux(() => { this.broadcast(message, args) })
    }

    const messageSender = new MessageSender(message, args)

    this.emit('outgoingMessage', { message: messageSender.message })
    messageSender.send(this.configuration.websocketProvider)
  }

  onMessage(event: MessageEvent) {
    const message = new IncomingMessage(event.data)

    const documentName = message.readVarString()

    message.writeVarString(documentName)

    this.emit('message', { event, message: new IncomingMessage(event.data) })

    new MessageReceiver(message).apply(this, true)
  }

  onClose(event: CloseEvent) {
    this.isAuthenticated = false
    this.synced = false

    // update awareness (all users except local left)
    if (this.awareness) {
      removeAwarenessStates(
        this.awareness,
        Array.from(this.awareness.getStates().keys()).filter(client => client !== this.document.clientID),
        this,
      )
    }
  }

  destroy() {
    this.emit('destroy')

    if (this.intervals.forceSync) {
      clearInterval(this.intervals.forceSync)
    }

    if (this.awareness) {
      removeAwarenessStates(this.awareness, [this.document.clientID], 'provider destroy')
      this.awareness.off('update', this.boundAwarenessUpdateHandler)
      this.awareness.destroy()
    }

    this.document.off('update', this.boundDocumentUpdateHandler)

    this.removeAllListeners()

    this.configuration.websocketProvider.off('connect', this.configuration.onConnect)
    this.configuration.websocketProvider.off('connect', this.forwardConnect)
    this.configuration.websocketProvider.off('open', this.boundOnOpen)
    this.configuration.websocketProvider.off('open', this.forwardOpen)
    this.configuration.websocketProvider.off('close', this.boundOnClose)
    this.configuration.websocketProvider.off('close', this.configuration.onClose)
    this.configuration.websocketProvider.off('close', this.forwardClose)
    this.configuration.websocketProvider.off('status', this.boundOnStatus)
    this.configuration.websocketProvider.off('disconnect', this.configuration.onDisconnect)
    this.configuration.websocketProvider.off('disconnect', this.forwardDisconnect)
    this.configuration.websocketProvider.off('destroy', this.configuration.onDestroy)
    this.configuration.websocketProvider.off('destroy', this.forwardDestroy)

    this.send(CloseMessage, { documentName: this.configuration.name })
    this.disconnect()

    if (typeof window === 'undefined' || !('removeEventListener' in window)) {
      return
    }

    window.removeEventListener('pagehide', this.boundPageHide)
  }

  permissionDeniedHandler(reason: string) {
    this.emit('authenticationFailed', { reason })
    this.isAuthenticated = false
    this.disconnect()
    this.status = WebSocketStatus.Disconnected
  }

  authenticatedHandler(scope: string) {
    this.isAuthenticated = true
    this.authorizedScope = scope

    this.emit('authenticated')
  }

  get broadcastChannel() {
    return `${this.configuration.name}`
  }

  broadcastChannelSubscriber(data: ArrayBuffer) {
    this.mux(() => {
      const message = new IncomingMessage(data)

      const documentName = message.readVarString()

      message.writeVarString(documentName)

      new MessageReceiver(message)
        .setBroadcasted(true)
        .apply(this, false)
    })
  }

  subscribeToBroadcastChannel() {
    if (!this.subscribedToBroadcastChannel) {
      bc.subscribe(this.broadcastChannel, this.boundBroadcastChannelSubscriber)
      this.subscribedToBroadcastChannel = true
    }

    this.mux(() => {
      this.broadcast(SyncStepOneMessage, { document: this.document, documentName: this.configuration.name })
      this.broadcast(SyncStepTwoMessage, { document: this.document, documentName: this.configuration.name })
      this.broadcast(QueryAwarenessMessage, { document: this.document, documentName: this.configuration.name })
      if (this.awareness) {
        this.broadcast(AwarenessMessage, {
          awareness: this.awareness,
          clients: [this.document.clientID],
          document: this.document,
          documentName: this.configuration.name,
        })
      }
    })
  }

  disconnectBroadcastChannel() {
    // broadcast message with local awareness state set to null (indicating disconnect)
    if (this.awareness) {
      this.send(AwarenessMessage, {
        awareness: this.awareness,
        clients: [this.document.clientID],
        states: new Map(),
        documentName: this.configuration.name,
      }, true)
    }

    if (this.subscribedToBroadcastChannel) {
      bc.unsubscribe(this.broadcastChannel, this.boundBroadcastChannelSubscriber)
      this.subscribedToBroadcastChannel = false
    }
  }

  broadcast(Message: ConstructableOutgoingMessage, args?: any) {
    if (!this.configuration.broadcast) {
      return
    }

    if (!this.subscribedToBroadcastChannel) {
      return
    }

    new MessageSender(Message, args).broadcast(this.broadcastChannel)
  }

  setAwarenessField(key: string, value: any) {
    if (!this.awareness) {
      throw new AwarenessError(`Cannot set awareness field "${key}" to ${JSON.stringify(value)}. You have disabled Awareness for this provider by explicitly passing awareness: null in the provider configuration.`)
    }
    this.awareness.setLocalStateField(key, value)
  }
}
