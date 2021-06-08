// @ts-nocheck
import * as Y from 'yjs'
import * as bc from 'lib0/broadcastchannel'
import * as time from 'lib0/time'
import * as encoding from 'lib0/encoding'
import * as syncProtocol from 'y-protocols/sync'
import {
  Awareness,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from 'y-protocols/awareness'
import * as mutex from 'lib0/mutex'
import * as math from 'lib0/math'
import * as url from 'lib0/url'

import { CloseEvent, MessageEvent, OpenEvent } from 'ws'
import EventEmitter from './EventEmitter'
import { IncomingMessage } from './IncomingMessage'
import { MessageTypes } from './types'
import { MessageHandler } from './MessageHandler'

export enum WebSocketStatus {
  Connecting = 'connecting',
  Connected = 'connected',
  Disconnected = 'disconnected',
}

export interface HocuspocusProviderOptions {
  name: string,
  document: Y.Doc,
  connect: boolean,
  awareness: Awareness,
  parameters: Object<string, string>,
  WebSocketPolyfill: WebSocket,
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
}

export class HocuspocusProvider extends EventEmitter {
  public options: HocuspocusProviderOptions = {
    url: '',
    name: '',
    document: null,
    connect: true,
    awareness: null,
    parameters: {},
    WebSocketPolyfill: typeof WebSocket !== 'undefined' ? WebSocket : null,
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

  document: Y.Doc

  subscribedToBroadcastChannel = false

  websocket: WebSocket = null

  shouldConnect: boolean

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

    this.shouldConnect = options.connect
    this.awareness = options.awareness ? options.awareness : new Awareness(this.document)

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

    // no message received in a long time - not even your own awareness
    // updates (which are updated every 15 seconds)
    this.websocket.close()
  }

  forceSync() {
    if (!this.websocket) {
      return
    }

    // resend sync step 1
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MessageTypes.Sync)
    syncProtocol.writeSyncStep1(encoder, this.document)

    this.websocket?.send(encoding.toUint8Array(encoder))
  }

  registerBeforeUnloadEventListener() {
    if (typeof window === 'undefined') {
      return
    }

    window.addEventListener('beforeunload', () => {
      removeAwarenessStates(
        this.awareness,
        [this.document.clientID],
        'window unload',
      )
    })
  }

  broadcastChannelSubscriber(data: ArrayBuffer) {
    this.mux(() => {
      const encoder = this.retrieveMessage(new Uint8Array(data), false)
      if (encoding.length(encoder) > 1) {
        bc.publish(this.broadcastChannel, encoding.toUint8Array(encoder))
      }
    })
  }

  documentUpdateHandler(update: Uint8Array, origin: any) {
    if (origin === this) {
      return
    }

    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MessageTypes.Sync)
    syncProtocol.writeUpdate(encoder, update)

    this.sendMessage(encoding.toUint8Array(encoder))
  }

  awarenessUpdateHandler({ added, updated, removed }: any, origin: any) {
    const changedClients = added.concat(updated).concat(removed)

    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MessageTypes.Awareness)
    encoding.writeVarUint8Array(encoder, encodeAwarenessUpdate(this.awareness, changedClients))

    this.sendMessage(encoding.toUint8Array(encoder))
  }

  get document() {
    return this.options.document
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

    // send sync step1 to bc
    this.mux(() => {
      // write sync step 1
      const encoderSync = encoding.createEncoder()
      encoding.writeVarUint(encoderSync, MessageTypes.Sync)
      syncProtocol.writeSyncStep1(encoderSync, this.document)
      bc.publish(this.broadcastChannel, encoding.toUint8Array(encoderSync))

      // broadcast local state
      const encoderState = encoding.createEncoder()
      encoding.writeVarUint(encoderState, MessageTypes.Sync)
      syncProtocol.writeSyncStep2(encoderState, this.document)
      bc.publish(this.broadcastChannel, encoding.toUint8Array(encoderState))

      // write queryAwareness
      const encoderAwarenessQuery = encoding.createEncoder()
      encoding.writeVarUint(encoderAwarenessQuery, MessageTypes.QueryAwareness)
      bc.publish(this.broadcastChannel, encoding.toUint8Array(encoderAwarenessQuery))

      // broadcast local awareness state
      const encoderAwarenessState = encoding.createEncoder()
      encoding.writeVarUint(encoderAwarenessState, MessageTypes.Awareness)
      encoding.writeVarUint8Array(encoderAwarenessState, encodeAwarenessUpdate(this.awareness, [this.document.clientID]))
      bc.publish(this.broadcastChannel, encoding.toUint8Array(encoderAwarenessState))
    })
  }

  disconnectBroadcastChannel() {
    // broadcast message with local awareness state set to null (indicating disconnect)
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MessageTypes.Awareness)
    encoding.writeVarUint8Array(encoder, encodeAwarenessUpdate(this.awareness, [this.document.clientID], new Map()))
    this.sendMessage(encoding.toUint8Array(encoder))

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
      this.startWebSocketConnection()
      this.subscribeToBroadcastChannel()
    }
  }

  onMessage(event: MessageEvent) {
    this.emit('message', event)

    this.lastMessageReceived = time.getUnixTime()

    if (this.status !== WebSocketStatus.Connected) {
      this.websocketConnectionEstablished()
    }

    const encoder = this.retrieveMessage(new Uint8Array(event.data), true)

    // TODO: What’s that?
    if (encoding.length(encoder) > 1) {
      this.websocket?.send(encoding.toUint8Array(encoder))
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
      const wait = math.min(
        math.log10(this.failedConnectionAttempts + 1) * this.options.reconnectTimeoutBase,
        this.options.maxReconnectTimeout,
      )

      console.log(`Reconnecting in ${wait}ms …`)
      setTimeout(this.startWebSocketConnection.bind(this), wait)

      return
    }

    this.status = WebSocketStatus.Disconnected
    this.emit('status', { status: 'disconnected' })
    this.emit('disconnect', event)
  }

  startWebSocketConnection() {
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

  // TODO: receive instead of retrieve?
  retrieveMessage(input: Uint8Array, emitSynced: boolean): encoding.Encoder {
    this.lastMessageReceived = time.getUnixTime()

    const message = new IncomingMessage(input)

    return new MessageHandler(message).handle(this, emitSynced)
  }

  websocketConnectionEstablished() {
    this.failedConnectionAttempts = 0
    this.status = WebSocketStatus.Connected
    this.emit('status', { status: 'connected' })
    this.emit('connect')

    this.sendFirstSyncStep()
    this.sendLocalAwarenessState()
  }

  sendMessage(buffer: ArrayBuffer): void {
    if (this.status === WebSocketStatus.Connected) {
      this.websocket?.send(buffer)
    }

    if (this.subscribedToBroadcastChannel) {
      this.mux(() => {
        bc.publish(this.broadcastChannel, buffer)
      })
    }
  }

  sendFirstSyncStep() {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MessageTypes.Sync)
    syncProtocol.writeSyncStep1(encoder, this.document)

    this.websocket?.send(encoding.toUint8Array(encoder))
  }

  sendLocalAwarenessState() {
    if (this.awareness.getLocalState() === null) {
      return
    }

    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MessageTypes.Awareness)
    encoding.writeVarUint8Array(encoder, encodeAwarenessUpdate(this.awareness, [this.document.clientID]))

    this.websocket?.send(encoding.toUint8Array(encoder))
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
