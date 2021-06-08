// @ts-nocheck
import * as Y from 'yjs'
import * as bc from 'lib0/broadcastchannel'
import * as time from 'lib0/time'
import * as encoding from 'lib0/encoding'
import {
  Awareness,
  removeAwarenessStates,
} from 'y-protocols/awareness'
import * as mutex from 'lib0/mutex'
import * as math from 'lib0/math'
import * as url from 'lib0/url'

import { CloseEvent, MessageEvent, OpenEvent } from 'ws'
import EventEmitter from './EventEmitter'
import { IncomingMessage } from './IncomingMessage'
import { MessageHandler } from './MessageHandler'
import { SyncStepOneMessage } from './OutgoingMessages/SyncStepOneMessage'
import { SyncStepTwoMessage } from './OutgoingMessages/SyncStepTwoMessage'
import { QueryAwarenessMessage } from './OutgoingMessages/QueryAwarenessMessage'
import { AwarenessMessage } from './OutgoingMessages/AwarenessMessage'
import { UpdateMessage } from './OutgoingMessages/UpdateMessage'

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
  awareness: Awareness,
  parameters: { [key: string]: any },
  WebSocketPolyfill: any,
  forceSyncInterval: false | number,
  reconnectTimeoutBase: number,
  maxReconnectTimeout: number,
  messageReconnectTimeout: number,
  onOpen: (event: OpenEvent) => void,
  onConnect: () => void,
  onMessage: (event: MessageEvent) => void,
  onSynced: () => void,
  onDisconnect: (event: CloseEvent) => void,
  onClose: (event: CloseEvent) => void,
  onDestroy: () => void,
  debug: boolean,
}

export class HocuspocusProvider extends EventEmitter {
  public options: HocuspocusProviderOptions = {
    url: '',
    name: '',
    parameters: {},
    debug: false,
    connect: true,
    forceSyncInterval: false,
    reconnectTimeoutBase: 1200,
    maxReconnectTimeout: 2500,
    // TODO: this should depend on awareness.outdatedTime
    messageReconnectTimeout: 30000,
    onOpen: () => null,
    onConnect: () => null,
    onMessage: () => null,
    onSynced: () => null,
    onDisconnect: () => null,
    onClose: () => null,
    onDestroy: () => null,
  }

  awareness: Awareness

  subscribedToBroadcastChannel = false

  websocket: any = null

  shouldConnect = true

  status: WebSocketStatus = WebSocketStatus.Disconnected

  failedConnectionAttempts = 0

  isSynced = false

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
    this.on('connect', this.options.onConnect)
    this.on('message', this.options.onMessage)
    this.on('synced', this.options.onSynced)
    this.on('disconnect', this.options.onDisconnect)
    this.on('close', this.options.onClose)
    this.on('destroy', this.options.onDestroy)

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

  checkConnection() {
    if (this.status !== WebSocketStatus.Connected) {
      return
    }

    if (this.options.messageReconnectTimeout >= time.getUnixTime() - this.lastMessageReceived) {
      return
    }

    // No message received in a long time, not even your own
    // Awareness updates, which are updated every 15 seconds.
    this.websocket.close()
  }

  forceSync() {
    if (!this.websocket) {
      return
    }

    this.send(new SyncStepOneMessage().get(this.document))
  }

  registerBeforeUnloadEventListener() {
    if (typeof window === 'undefined') {
      return
    }

    window.addEventListener('beforeunload', () => {
      removeAwarenessStates(this.awareness, [this.document.clientID], 'window unload')
    })
  }

  broadcastChannelSubscriber(data: ArrayBuffer) {
    this.mux(() => {
      const encoder = this.receiveMessage(new Uint8Array(data), false)

      // TODO: What’s that doing?
      if (encoding.length(encoder) > 1) {
        this.broadcast(encoding.toUint8Array(encoder))
      }
    })
  }

  documentUpdateHandler(update: Uint8Array, origin: any) {
    if (origin === this) {
      return
    }

    this.send(new UpdateMessage().get(update), true)
  }

  awarenessUpdateHandler({ added, updated, removed }: any, origin: any) {
    const changedClients = added.concat(updated).concat(removed)

    this.send(new AwarenessMessage().get(this.awareness, changedClients), true)
  }

  get document() {
    return this.options.document
  }

  get awareness() {
    return this.options.awareness
  }

  // ensure that url is always ends with /
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

  get broadcastChannel() {
    return `${this.serverUrl}/${this.options.name}`
  }

  get synced(): boolean {
    return this.isSynced
  }

  set synced(state) {
    if (this.isSynced === state) {
      return
    }

    this.isSynced = state
    this.emit('synced', state)
    this.emit('sync', state)
  }

  subscribeToBroadcastChannel() {
    if (!this.subscribedToBroadcastChannel) {
      bc.subscribe(this.broadcastChannel, this.broadcastChannelSubscriber.bind(this))
      this.subscribedToBroadcastChannel = true
    }

    this.mux(() => {
      this.broadcast(new SyncStepOneMessage().get(this.document))
      this.broadcast(new SyncStepTwoMessage().get(this.document))
      this.broadcast(new QueryAwarenessMessage().get())
      this.broadcast(new AwarenessMessage().get(this.awareness, [this.document.clientID]))
    })
  }

  broadcast(message: Uint8Array) {
    bc.publish(this.broadcastChannel, message)
  }

  send(message: Uint8Array, broadcast = false) {
    if (broadcast && this.subscribedToBroadcastChannel) {
      this.mux(() => {
        this.broadcast(message)
      })
    }

    if (this.status === WebSocketStatus.Connected) {
      this.websocket?.send(message)
    }
  }

  disconnectBroadcastChannel() {
    // broadcast message with local awareness state set to null (indicating disconnect)
    this.send(new AwarenessMessage().get(this.awareness, [this.document.clientID], new Map()), true)

    if (this.subscribedToBroadcastChannel) {
      bc.unsubscribe(this.broadcastChannel, this.broadcastChannelSubscriber.bind(this))
      this.subscribedToBroadcastChannel = false
    }
  }

  disconnect() {
    this.shouldConnect = false
    this.disconnectBroadcastChannel()

    if (this.websocket === null) {
      return
    }

    try {
      this.websocket.close()
    } catch {
      //
    }
  }

  connect() {
    this.shouldConnect = true

    if (this.status !== WebSocketStatus.Connected) {
      this.createWebSocketConnection()
      this.subscribeToBroadcastChannel()
    }
  }

  onMessage(event: MessageEvent) {
    this.emit('message', event)

    this.lastMessageReceived = time.getUnixTime()

    if (this.status !== WebSocketStatus.Connected) {
      this.websocketConnectionEstablished()
    }

    const encoder = this.receiveMessage(new Uint8Array(event.data), true)

    // TODO: What’s that doing?
    if (encoding.length(encoder) > 1) {
      this.send(encoding.toUint8Array(encoder))
    }
  }

  onClose(event: CloseEvent) {
    this.emit('close', event)

    this.websocket = null

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
      this.emit('disconnect', event)
    } else {
      this.failedConnectionAttempts += 1
    }

    if (this.shouldConnect) {
      const wait = math.round(math.min(
        math.log10(this.failedConnectionAttempts + 1) * this.options.reconnectTimeoutBase,
        this.options.maxReconnectTimeout,
      ))

      if (this.options.debug) {
        console.log(`Reconnecting in ${wait}ms …`)
      }

      setTimeout(this.createWebSocketConnection.bind(this), wait)

      return
    }

    this.status = WebSocketStatus.Disconnected
    this.emit('status', { status: 'disconnected' })
    this.emit('disconnect', event)
  }

  createWebSocketConnection() {
    if (this.websocket !== null) {
      return
    }

    this.websocket = new this.options.WebSocketPolyfill(this.url)
    this.websocket.binaryType = 'arraybuffer'

    this.status = WebSocketStatus.Connecting
    this.synced = false

    this.websocket.onmessage = this.onMessage.bind(this)
    this.websocket.onclose = this.onClose.bind(this)
    this.websocket.onopen = this.onOpen.bind(this)

    this.emit('status', {
      status: 'connecting',
    })
  }

  onOpen(event: OpenEvent) {
    this.emit('open', event)
  }

  receiveMessage(input: Uint8Array, emitSynced: boolean): encoding.Encoder {
    const message = new IncomingMessage(input)

    return new MessageHandler(this, message).handle(emitSynced)
  }

  websocketConnectionEstablished() {
    this.failedConnectionAttempts = 0
    this.status = WebSocketStatus.Connected
    this.emit('status', { status: 'connected' })
    this.emit('connect')

    this.send(new SyncStepOneMessage().get(this.document))

    if (this.awareness.getLocalState() !== null) {
      this.send(new AwarenessMessage().get(this.awareness, [this.document.clientID]))
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
}
