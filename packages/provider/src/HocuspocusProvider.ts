// @ts-nocheck
import * as Y from 'yjs'
import * as bc from 'lib0/broadcastchannel'
import * as time from 'lib0/time'
import { Awareness, removeAwarenessStates } from 'y-protocols/awareness'
import * as mutex from 'lib0/mutex'
import * as math from 'lib0/math'
import * as url from 'lib0/url'

import { CloseEvent, MessageEvent, OpenEvent } from 'ws'
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

export enum WebSocketStatus {
  Connecting = 'connecting',
  Connected = 'connected',
  Disconnected = 'disconnected',
}

export interface HocuspocusProviderOptions {
  url: string,
  name: string,
  document: Y.Doc,
  connect: boolean,
  broadcast: boolean,
  awareness: Awareness,
  token: string,
  parameters: { [key: string]: any },
  WebSocketPolyfill: any,
  forceSyncInterval: false | number,
  reconnectTimeoutBase: number,
  maxReconnectTimeout: number,
  messageReconnectTimeout: number,
  onAuthenticated: () => void,
  onAuthenticationFailed: ({ reason: string }) => void,
  onOpen: (event: OpenEvent) => void,
  onConnect: () => void,
  onMessage: (event: MessageEvent) => void,
  onOutgoingMessage: (message: OutgoingMessage) => void,
  onStatus: (status: any) => void,
  onSynced: () => void,
  onDisconnect: (event: CloseEvent) => void,
  onClose: (event: CloseEvent) => void,
  onDestroy: () => void,
  onAwarenessChange: (states: any) => void,
  debug: boolean,
}

export class HocuspocusProvider extends EventEmitter {
  public options: HocuspocusProviderOptions = {
    url: '',
    name: '',
    token: null,
    parameters: {},
    debug: false,
    connect: true,
    broadcast: true,
    forceSyncInterval: false,
    reconnectTimeoutBase: 1200,
    maxReconnectTimeout: 2500,
    // TODO: this should depend on awareness.outdatedTime
    messageReconnectTimeout: 30000,
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
    onAwarenessChange: () => null,
  }

  awareness: Awareness

  subscribedToBroadcastChannel = false

  webSocket: any = null

  shouldConnect = true

  status: WebSocketStatus = WebSocketStatus.Disconnected

  failedConnectionAttempts = 0

  isSynced = false

  isAuthenticated = false

  lastMessageReceived = 0

  mux = mutex.createMutex()

  intervals: any = {
    forceSync: null,
    connectionChecker: null,
  }

  constructor(options: Partial<HocuspocusProviderOptions> = {}) {
    super()

    this.setOptions(options)

    this.options.document = options.document ? options.document : new Y.Doc()
    this.options.awareness = options.awareness ? options.awareness : new Awareness(this.document)
    this.options.WebSocketPolyfill = options.WebSocketPolyfill ? options.WebSocketPolyfill : WebSocket
    this.shouldConnect = options.connect !== undefined ? options.connect : this.shouldConnect

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
    this.on('awarenessChange', this.options.onAwarenessChange)

    this.awareness.on('change', () => {
      this.emit('awarenessChange', {
        states: awarenessStatesToArray(this.awareness.getStates()),
      })
    })

    this.intervals.connectionChecker = setInterval(
      this.checkConnection.bind(this),
      this.options.messageReconnectTimeout / 10,
    )

    this.document.on('update', this.documentUpdateHandler.bind(this))
    this.awareness.on('update', this.awarenessUpdateHandler.bind(this))
    this.registerBeforeUnloadEventListener()

    if (this.options.forceSyncInterval) {
      this.intervals.forceSync = setInterval(
        this.forceSync.bind(this),
        this.options.forceSyncInterval,
      )
    }

    if (this.options.connect) {
      this.connect()
    }
  }

  public setOptions(options: Partial<HocuspocusProviderOptions> = {}): void {
    this.options = { ...this.options, ...options }
  }

  get document() {
    return this.options.document
  }

  get awareness() {
    return this.options.awareness
  }

  checkConnection() {
    if (this.status !== WebSocketStatus.Connected) {
      return
    }

    if (this.options.messageReconnectTimeout >= time.getUnixTime() - this.lastMessageReceived) {
      return
    }

    // No message received in a long time, not even your own
    // Awareness updates, which are updated every 15 seconds.
    this.webSocket.close()
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
    this.log('Permission denied', reason)

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

  connect() {
    this.shouldConnect = true

    if (this.status !== WebSocketStatus.Connected) {
      this.createWebSocketConnection()
      this.subscribeToBroadcastChannel()
    }
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

  createWebSocketConnection() {
    if (this.webSocket !== null) {
      return
    }

    this.webSocket = new this.options.WebSocketPolyfill(this.url)
    this.webSocket.binaryType = 'arraybuffer'

    this.status = WebSocketStatus.Connecting
    this.synced = false

    this.webSocket.onmessage = this.onMessage.bind(this)
    this.webSocket.onclose = this.onClose.bind(this)
    this.webSocket.onopen = this.onOpen.bind(this)

    this.emit('status', { status: 'connecting' })
  }

  onOpen(event: OpenEvent) {
    this.emit('open', { event })

    if (this.status !== WebSocketStatus.Connected) {
      this.webSocketConnectionEstablished()
    }
  }

  webSocketConnectionEstablished() {
    this.failedConnectionAttempts = 0
    this.status = WebSocketStatus.Connected
    this.emit('status', { status: 'connected' })
    this.emit('connect')

    if (this.isAuthenticationRequired) {
      this.send(AuthenticationMessage, { token: this.options.token })
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

  send(Message: OutgoingMessage, args: any, broadcast = false) {
    if (broadcast) {
      this.mux(() => {
        this.broadcast(Message, args)
      })
    }

    if (this.status === WebSocketStatus.Connected) {
      const messageSender = new MessageSender(Message, args)

      this.emit('outgoingMessage', { message: messageSender.message })
      messageSender.send(this.webSocket)
    }
  }

  onMessage(event: MessageEvent) {
    this.lastMessageReceived = time.getUnixTime()

    const message = new IncomingMessage(event.data)

    this.emit('message', { event, message })

    new MessageReceiver(message).apply(this)

    // TODO: What’s that doing?
    // Move to the MessageReceiver
    // if (encoding.length(encoder) > 1) {
    //   this.send(encoding.toUint8Array(encoder))
    // }
  }

  onClose(event: CloseEvent) {
    this.emit('close', { event })

    this.isAuthenticated = false
    this.webSocket = null

    if (this.status === WebSocketStatus.Connected) {
      this.synced = false

      // update awareness (all users except local left)
      removeAwarenessStates(
        this.awareness,
        Array.from(this.awareness.getStates().keys()).filter(client => client !== this.document.clientID),
        this,
      )

      this.status = WebSocketStatus.Disconnected
      this.emit('status', { status: 'disconnected' })
      this.emit('disconnect', { event })
    } else {
      this.failedConnectionAttempts += 1
    }

    if (this.shouldConnect) {
      const wait = math.round(math.min(
        math.log10(this.failedConnectionAttempts + 1) * this.options.reconnectTimeoutBase,
        this.options.maxReconnectTimeout,
      ))

      this.log(`[close] Reconnecting in ${wait}ms …`)
      setTimeout(this.createWebSocketConnection.bind(this), wait)

      return
    }

    if (this.status !== WebSocketStatus.Disconnected) {
      this.status = WebSocketStatus.Disconnected
      this.emit('status', { status: 'disconnected' })
      this.emit('disconnect', { event })
    }
  }

  destroy() {
    this.emit('destroy')

    if (this.intervals.forceSync) {
      clearInterval(this.intervals.forceSync)
    }

    clearInterval(this.intervals.connectionChecker)

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
      const encoder = new MessageReceiver(message, this).apply(this, false)

      // TODO: What’s that doing?
      // if (encoding.length(encoder) > 1) {
      //   this.broadcast(encoding.toUint8Array(encoder))
      // }
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

  broadcast(Message: OutgoingMessage, args: any) {
    if (!this.options.broadcast) {
      return
    }

    if (!this.subscribedToBroadcastChannel) {
      return
    }

    new MessageSender(Message, args).broadcast(this.broadcastChannel)
  }

  log(message: string): void {
    if (!this.options.debug) {
      return
    }

    console.log(message)
  }

  setAwarenessField(key: string, value: any) {
    this.awareness.setLocalStateField(key, value)
  }
}
