import * as Y from 'yjs'
import * as bc from 'lib0/broadcastchannel'
import * as time from 'lib0/time'
import { Awareness, removeAwarenessStates } from 'y-protocols/awareness'
import * as mutex from 'lib0/mutex'
import * as url from 'lib0/url'
import { Event, CloseEvent, MessageEvent } from 'ws'
import { retry } from '@lifeomic/attempt'
import EventEmitter from './EventEmitter'
import { IncomingMessage } from './IncomingMessage'
import { MessageReceiver } from './MessageReceiver'
import { MessageSender } from './MessageSender'
import { SyncStepOneMessage } from './OutgoingMessages/SyncStepOneMessage'
import { SyncStepTwoMessage } from './OutgoingMessages/SyncStepTwoMessage'
import { QueryAwarenessMessage } from './OutgoingMessages/QueryAwarenessMessage'
import { AuthenticationMessage } from './OutgoingMessages/AuthenticationMessage'
import { AwarenessMessage } from './OutgoingMessages/AwarenessMessage'
import { UpdateMessage } from './OutgoingMessages/UpdateMessage'
import { OutgoingMessage } from './OutgoingMessage'
import awarenessStatesToArray from './utils/awarenessStatesToArray'
import { ConstructableOutgoingMessage } from './types'

export enum WebSocketStatus {
  Connecting = 'connecting',
  Connected = 'connected',
  Disconnected = 'disconnected',
}

export interface HocuspocusProviderOptions {
  /**
   * URL of your @hocuspocus/server instance
   */
  url: string,
  /**
   * The identifier/name of your document
   */
  name: string,
  /**
   * The actual Y.js document
   */
  document: Y.Doc,
  /**
   * Pass `false` to start the connection manually.
   */
  connect: boolean,
  /**
   * Pass false to disable broadcasting between browser tabs.
   */
  broadcast: boolean,
  /**
   * An Awareness instance to keep the presence state of all clients.
   */
  awareness: Awareness,
  /**
   * A token that’s sent to the backend for authentication purposes.
   */
  token: string | (() => string) | (() => Promise<string>) | null,
  /**
   * URL parameters that should be added.
   */
  parameters: { [key: string]: any },
  /**
   * An optional WebSocket polyfill, for example for Node.js
   */
  WebSocketPolyfill: any,
  /**
   * Force syncing the document in the defined interval.
   */
  forceSyncInterval: false | number,
  /**
   * Disconnect when no message is received for the defined amount of milliseconds.
   */
  messageReconnectTimeout: number,
  /**
   * The delay between each attempt in milliseconds. You can provide a factor to have the delay grow exponentially.
   */
  delay: number,
  /**
   * The intialDelay is the amount of time to wait before making the first attempt. This option should typically be 0 since you typically want the first attempt to happen immediately.
   */
  initialDelay: number,
  /**
   * The factor option is used to grow the delay exponentially.
   */
  factor: number,
  /**
   * The maximum number of attempts or 0 if there is no limit on number of attempts.
   */
  maxAttempts: number,
  /**
   * minDelay is used to set a lower bound of delay when jitter is enabled. This property has no effect if jitter is disabled.
   */
  minDelay: number,
  /**
   * The maxDelay option is used to set an upper bound for the delay when factor is enabled. A value of 0 can be provided if there should be no upper bound when calculating delay.
   */
  maxDelay: number,
  /**
   * If jitter is true then the calculated delay will be a random integer value between minDelay and the calculated delay for the current iteration.
   */
  jitter: boolean,
  /**
   * A timeout in milliseconds. If timeout is non-zero then a timer is set using setTimeout. If the timeout is triggered then future attempts will be aborted.
   */
  timeout: number,
  onAuthenticated: () => void,
  onAuthenticationFailed: ({ reason }: { reason: string }) => void,
  onOpen: (event: Event) => void,
  onConnect: () => void,
  onMessage: (event: MessageEvent) => void,
  onOutgoingMessage: (message: OutgoingMessage) => void,
  onStatus: (status: any) => void,
  onSynced: () => void,
  onDisconnect: (event: CloseEvent) => void,
  onClose: (event: CloseEvent) => void,
  onDestroy: () => void,
  onAwarenessUpdate: (states: any) => void,
  onAwarenessChange: (states: any) => void,
}

export class HocuspocusProvider extends EventEmitter {
  public options: HocuspocusProviderOptions = {
    // @ts-ignore
    document: undefined,
    // @ts-ignore
    awareness: undefined,
    WebSocketPolyfill: undefined,
    url: '',
    name: '',
    token: null,
    parameters: {},
    connect: true,
    broadcast: true,
    forceSyncInterval: false,
    // TODO: this should depend on awareness.outdatedTime
    messageReconnectTimeout: 30000,
    // 1 second
    delay: 1000,
    // instant
    initialDelay: 0,
    // double the delay each time
    factor: 2,
    // unlimited retries
    maxAttempts: 0,
    // wait at least 1 second
    minDelay: 1000,
    // at least every 30 seconds
    maxDelay: 30000,
    // randomize
    jitter: true,
    // retry forever
    timeout: 0,
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
  }

  subscribedToBroadcastChannel = false

  webSocket: WebSocket | null = null

  shouldConnect = true

  status = WebSocketStatus.Disconnected

  isSynced = false

  isAuthenticated = false

  lastMessageReceived = 0

  mux = mutex.createMutex()

  intervals: any = {
    forceSync: null,
    connectionChecker: null,
  }

  connectionAttempt: {
    resolve: (value?: any) => void
    reject: (reason?: any) => void
  } | null = null

  constructor(options: Partial<HocuspocusProviderOptions> = {}) {
    super()
    this.setOptions(options)

    this.options.document = options.document ? options.document : new Y.Doc()
    this.options.awareness = options.awareness ? options.awareness : new Awareness(this.document)
    this.options.WebSocketPolyfill = options.WebSocketPolyfill ? options.WebSocketPolyfill : WebSocket

    this.on('open', this.options.onOpen)
    this.on('authenticated', this.options.onAuthenticated)
    this.on('authenticationFailed', this.options.onAuthenticationFailed)
    this.on('connect', this.options.onConnect)
    this.on('message', this.options.onMessage)
    this.on('outgoingMessage', this.options.onOutgoingMessage)
    this.on('synced', this.options.onSynced)
    this.on('status', this.options.onStatus)
    this.on('disconnect', this.options.onDisconnect)
    this.on('close', this.options.onClose)
    this.on('destroy', this.options.onDestroy)
    this.on('awarenessUpdate', this.options.onAwarenessUpdate)
    this.on('awarenessChange', this.options.onAwarenessChange)

    this.awareness.on('update', () => {
      this.emit('awarenessUpdate', { states: awarenessStatesToArray(this.awareness.getStates()) })
    })

    this.awareness.on('change', () => {
      this.emit('awarenessChange', { states: awarenessStatesToArray(this.awareness.getStates()) })
    })

    this.document.on('update', this.documentUpdateHandler.bind(this))
    this.awareness.on('update', this.awarenessUpdateHandler.bind(this))
    this.registerBeforeUnloadEventListener()

    this.intervals.connectionChecker = setInterval(
      this.checkConnection.bind(this),
      this.options.messageReconnectTimeout / 10,
    )

    if (this.options.forceSyncInterval) {
      this.intervals.forceSync = setInterval(
        this.forceSync.bind(this),
        this.options.forceSyncInterval,
      )
    }

    if (typeof options.connect !== 'undefined') {
      this.shouldConnect = options.connect
    }

    if (!this.shouldConnect) {
      return
    }

    this.connect()
  }

  public setOptions(options: Partial<HocuspocusProviderOptions> = {}): void {
    this.options = { ...this.options, ...options }
  }

  async connect() {
    if (this.status === WebSocketStatus.Connected) {
      return
    }

    this.shouldConnect = true
    this.subscribeToBroadcastChannel()

    try {
      await retry(this.createWebSocketConnection.bind(this), {
        delay: this.options.delay,
        initialDelay: this.options.initialDelay,
        factor: this.options.factor,
        maxAttempts: this.options.maxAttempts,
        minDelay: this.options.minDelay,
        maxDelay: this.options.maxDelay,
        jitter: this.options.jitter,
        timeout: this.options.timeout,
        beforeAttempt: context => {
          if (!this.shouldConnect) {
            context.abort()
          }
        },
      })
    } catch (error: any) {
      // If we aborted the connection attempt then don’t throw an error
      // ref: https://github.com/lifeomic/attempt/blob/master/src/index.ts#L136
      if (error && error.code !== 'ATTEMPT_ABORTED') {
        throw error
      }
    }
  }

  createWebSocketConnection() {
    return new Promise((resolve, reject) => {
      // Init the WebSocket connection
      const ws = new this.options.WebSocketPolyfill(this.url)
      ws.binaryType = 'arraybuffer'
      ws.onmessage = this.onMessage.bind(this)
      ws.onclose = this.onClose.bind(this)
      ws.onopen = this.onOpen.bind(this)
      ws.onerror = () => {
        reject()
      }
      this.webSocket = ws

      // Reset the status
      this.synced = false
      this.status = WebSocketStatus.Connecting
      this.emit('status', { status: 'connecting' })

      // Store resolve/reject for later use
      this.connectionAttempt = {
        resolve,
        reject,
      }
    })
  }

  resolveConnectionAttempt() {
    this.connectionAttempt?.resolve()
    this.connectionAttempt = null
  }

  rejectConnectionAttempt() {
    this.connectionAttempt?.reject()
    this.connectionAttempt = null
  }

  get document() {
    return this.options.document
  }

  get awareness() {
    return this.options.awareness
  }

  checkConnection() {
    // Don’t check the connection when it’s not even established
    if (this.status !== WebSocketStatus.Connected) {
      return
    }

    // Don’t close then connection while waiting for the first message
    if (!this.lastMessageReceived) {
      return
    }

    // Don’t close the connection when a message was received recently
    if (this.options.messageReconnectTimeout >= time.getUnixTime() - this.lastMessageReceived) {
      return
    }

    // No message received in a long time, not even your own
    // Awareness updates, which are updated every 15 seconds.
    this.webSocket?.close()
  }

  forceSync() {
    if (!this.webSocket) {
      return
    }

    this.send(SyncStepOneMessage, { document: this.document })
  }

  registerBeforeUnloadEventListener() {
    if (typeof window === 'undefined') {
      return
    }

    window.addEventListener('beforeunload', () => {
      removeAwarenessStates(this.awareness, [this.document.clientID], 'window unload')
    })
  }

  documentUpdateHandler(update: Uint8Array, origin: any) {
    if (origin === this) {
      return
    }

    this.send(UpdateMessage, { update }, true)
  }

  awarenessUpdateHandler({ added, updated, removed }: any, origin: any) {
    const changedClients = added.concat(updated).concat(removed)

    this.send(AwarenessMessage, {
      awareness: this.awareness,
      clients: changedClients,
    }, true)
  }

  permissionDeniedHandler(reason: string) {
    this.emit('authenticationFailed', { reason })
    this.isAuthenticated = false
    this.shouldConnect = false
  }

  authenticatedHandler() {
    this.isAuthenticated = true

    this.emit('authenticated')
    this.startSync()
  }

  // Ensure that the URL always ends with /
  get serverUrl() {
    while (this.options.url[this.options.url.length - 1] === '/') {
      return this.options.url.slice(0, this.options.url.length - 1)
    }

    return this.options.url
  }

  get url() {
    const encodedParams = url.encodeQueryParams(this.options.parameters)

    return `${this.serverUrl}/${this.options.name}${encodedParams.length === 0 ? '' : `?${encodedParams}`}`
  }

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

  get isAuthenticationRequired(): boolean {
    return !!this.options.token && !this.isAuthenticated
  }

  disconnect() {
    this.shouldConnect = false
    this.disconnectBroadcastChannel()

    if (this.webSocket === null) {
      return
    }

    try {
      this.webSocket.close()
    } catch {
      //
    }
  }

  onOpen(event: Event) {
    this.emit('open', { event })

    if (this.status !== WebSocketStatus.Connected) {
      this.webSocketConnectionEstablished()
    }
  }

  async getToken() {
    if (typeof this.options.token === 'function') {
      const token = await this.options.token()
      return token
    }

    return this.options.token
  }

  async webSocketConnectionEstablished() {
    this.status = WebSocketStatus.Connected
    this.emit('status', { status: 'connected' })
    this.emit('connect')

    if (this.isAuthenticationRequired) {
      this.send(AuthenticationMessage, {
        token: await this.getToken(),
      })
      return
    }

    this.startSync()
  }

  startSync() {
    this.send(SyncStepOneMessage, { document: this.document })

    if (this.awareness.getLocalState() !== null) {
      this.send(AwarenessMessage, {
        awareness: this.awareness,
        clients: [this.document.clientID],
      })
    }
  }

  send(Message: ConstructableOutgoingMessage, args: any, broadcast = false) {
    if (broadcast) {
      this.mux(() => { this.broadcast(Message, args) })
    }

    if (this.status === WebSocketStatus.Connected) {
      const messageSender = new MessageSender(Message, args)

      this.emit('outgoingMessage', { message: messageSender.message })
      messageSender.send(this.webSocket)
    }
  }

  onMessage(event: MessageEvent) {
    this.resolveConnectionAttempt()

    this.lastMessageReceived = time.getUnixTime()

    const message = new IncomingMessage(event.data)

    this.emit('message', { event, message })

    new MessageReceiver(message).apply(this)
  }

  onClose(event: CloseEvent) {
    this.emit('close', { event })

    this.webSocket = null
    this.isAuthenticated = false
    this.synced = false

    if (this.status === WebSocketStatus.Connected) {
      // update awareness (all users except local left)
      removeAwarenessStates(
        this.awareness,
        Array.from(this.awareness.getStates().keys()).filter(client => client !== this.document.clientID),
        this,
      )

      this.status = WebSocketStatus.Disconnected
      this.emit('status', { status: 'disconnected' })
      this.emit('disconnect', { event })
    }

    if (this.connectionAttempt) {
      // Okay, that connection attempt failed …
      this.rejectConnectionAttempt()
    } else if (this.shouldConnect) {
      // The connection was closed by the server, so let’s just try again.
      this.connect()
    }

    // If we’ll reconnect anyway, we’re done for now.
    if (this.shouldConnect) {
      return
    }

    // The status is set correctly already.
    if (this.status === WebSocketStatus.Disconnected) {
      return
    }

    // Let’s update the connection status.
    this.status = WebSocketStatus.Disconnected
    this.emit('status', { status: 'disconnected' })
    this.emit('disconnect', { event })
  }

  destroy() {
    this.emit('destroy')

    if (this.intervals.forceSync) {
      clearInterval(this.intervals.forceSync)
    }

    clearInterval(this.intervals.connectionChecker)

    removeAwarenessStates(this.awareness, [this.document.clientID], 'provider destroy')

    // If there is still a connection attempt outstanding then we should resolve
    // it before calling disconnect, otherwise it will be rejected in the onClose
    // handler and trigger a retry
    this.resolveConnectionAttempt()

    this.disconnect()

    this.awareness.off('update', this.awarenessUpdateHandler)
    this.document.off('update', this.documentUpdateHandler)

    this.removeAllListeners()
  }

  get broadcastChannel() {
    return `${this.serverUrl}/${this.options.name}`
  }

  broadcastChannelSubscriber(data: ArrayBuffer) {
    this.mux(() => {
      const message = new IncomingMessage(data)
      new MessageReceiver(message)
        .setBroadcasted(true)
        .apply(this, false)
    })
  }

  subscribeToBroadcastChannel() {
    if (!this.subscribedToBroadcastChannel) {
      bc.subscribe(this.broadcastChannel, this.broadcastChannelSubscriber.bind(this))
      this.subscribedToBroadcastChannel = true
    }

    this.mux(() => {
      this.broadcast(SyncStepOneMessage, { document: this.document })
      this.broadcast(SyncStepTwoMessage, { document: this.document })
      this.broadcast(QueryAwarenessMessage)
      this.broadcast(AwarenessMessage, { awareness: this.awareness, clients: [this.document.clientID] })
    })
  }

  disconnectBroadcastChannel() {
    // broadcast message with local awareness state set to null (indicating disconnect)
    this.send(AwarenessMessage, {
      awareness: this.awareness,
      clients: [this.document.clientID],
      states: new Map(),
    }, true)

    if (this.subscribedToBroadcastChannel) {
      bc.unsubscribe(this.broadcastChannel, this.broadcastChannelSubscriber.bind(this))
      this.subscribedToBroadcastChannel = false
    }
  }

  broadcast(Message: ConstructableOutgoingMessage, args?: any) {
    if (!this.options.broadcast) {
      return
    }

    if (!this.subscribedToBroadcastChannel) {
      return
    }

    new MessageSender(Message, args).broadcast(this.broadcastChannel)
  }

  setAwarenessField(key: string, value: any) {
    this.awareness.setLocalStateField(key, value)
  }
}
