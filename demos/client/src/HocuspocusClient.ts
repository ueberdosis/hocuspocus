// @ts-nocheck
import * as Y from 'yjs'
import * as bc from 'lib0/broadcastchannel'
import * as time from 'lib0/time'
import * as encoding from 'lib0/encoding'
import * as syncProtocol from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as mutex from 'lib0/mutex'
import { Observable } from 'lib0/observable'
import * as math from 'lib0/math'
import * as url from 'lib0/url'

import EventEmitter from './EventEmitter'
import { IncomingMessage } from './IncomingMessage'
import { MessageTypes } from './types'

export interface HocuspocusClientOptions {
  name: string,
  document: Y.Doc,
  connect: boolean,
  awareness: awarenessProtocol.Awareness,
  parameters: Object<string, string>,
  WebSocketPolyfill: WebSocket,
  forceSyncInterval: false | number,
  reconnectTimeoutBase: number,
  maxReconnectTimeout: number,
  messageReconnectTimeout: number,
}

export class HocuspocusClient extends EventEmitter {
  public options: HocuspocusClientOptions = {
    url: '',
    name: '',
    document: null,
    connect: true,
    awareness: null,
    parameters: {},
    WebSocketPolyfill: WebSocket,
    forceSyncInterval: false,
    reconnectTimeoutBase: 1200,
    maxReconnectTimeout: 2500,
    // TODO: this should depend on awareness.outdatedTime
    messageReconnectTimeout: 30000,
    onOpen: () => null,
    onMessage: () => null,
    onClose: () => null,
  }

  websocket: WebSocket = null

  websocketConnecting = false

  websocketConnected = false

  websocketConnectionAttempts = 0

  subscribedToBroadcastChannel = false

  isSynced = false

  shouldConnect = true

  lastMessageReceived = 0

  mux = mutex.createMutex()

  intervals = {
    forceSync: null,
    connectionChecker: null,
  }

  constructor(options: Partial<HocuspocusClientOptions> = {}) {
    super()

    this.options.awareness = new awarenessProtocol.Awareness(options.document)
    this.shouldConnect = options.connect

    this.setOptions(options)
    this.on('open', this.options.onOpen)
    this.on('message', this.options.onMessage)
    this.on('close', this.options.onClose)

    if (this.options.forceSyncInterval) {
      this.intervals.forceSync = setInterval(
        this.forceSync.bind(this),
        this.options.forceSyncInterval,
      )
    }

    this.intervals.connectionChecker = setInterval(
      this.checkConnection.bind(this),
      this.options.messageReconnectTimeout / 10,
    )

    this.options.document.on('update', this.updateHandler.bind(this))
    this.options.awareness.on('update', this.awarenessUpdateHandler.bind(this))
    this.registerBeforeUnloadEventListener()

    if (this.options.connect) {
      this.connect()
    }
  }

  checkConnection() {
    if (!this.websocketConnected) {
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
    syncProtocol.writeSyncStep1(encoder, this.options.document)
    this.websocket.send(encoding.toUint8Array(encoder))
  }

  registerBeforeUnloadEventListener() {
    if (typeof window === 'undefined') {
      return
    }

    window.addEventListener('beforeunload', () => {
      awarenessProtocol.removeAwarenessStates(
        this.options.awareness,
        [this.options.document.clientID],
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

  updateHandler(update: Uint8Array, origin: any) {
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
    encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(this.options.awareness, changedClients))

    this.sendMessage(encoding.toUint8Array(encoder))
  }

  public setOptions(options: Partial<HocuspocusClientOptions> = {}): void {
    this.options = { ...this.options, ...options }
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

  get synced(): Boolean {
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

  destroy() {
    if (this.intervals.forceSync) {
      clearInterval(this.intervals.forceSync)
    }
    clearInterval(this.intervals.connectionChecker)

    this.disconnect()
    this.options.awareness.off('update', this.awarenessUpdateHandler)
    this.options.document.off('update', this.updateHandler)
    super.destroy()
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
      syncProtocol.writeSyncStep1(encoderSync, this.options.document)
      bc.publish(this.broadcastChannel, encoding.toUint8Array(encoderSync))

      // broadcast local state
      const encoderState = encoding.createEncoder()
      encoding.writeVarUint(encoderState, MessageTypes.Sync)
      syncProtocol.writeSyncStep2(encoderState, this.options.document)
      bc.publish(this.broadcastChannel, encoding.toUint8Array(encoderState))

      // write queryAwareness
      const encoderAwarenessQuery = encoding.createEncoder()
      encoding.writeVarUint(encoderAwarenessQuery, MessageTypes.QueryAwareness)
      bc.publish(this.broadcastChannel, encoding.toUint8Array(encoderAwarenessQuery))

      // broadcast local awareness state
      const encoderAwarenessState = encoding.createEncoder()
      encoding.writeVarUint(encoderAwarenessState, MessageTypes.Awareness)
      encoding.writeVarUint8Array(encoderAwarenessState, awarenessProtocol.encodeAwarenessUpdate(this.options.awareness, [this.options.document.clientID]))
      bc.publish(this.broadcastChannel, encoding.toUint8Array(encoderAwarenessState))
    })
  }

  disconnectBroadcastChannel() {
    // broadcast message with local awareness state set to null (indicating disconnect)
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MessageTypes.Awareness)
    encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(this.options.awareness, [this.options.document.clientID], new Map()))
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

    this.websocket.close()
  }

  connect() {
    this.shouldConnect = true

    if (!this.websocketConnected && this.websocket === null) {
      this.startWebSocketConnection()
      this.subscribeToBroadcastChannel()
    }
  }

  onMessage(event) {
    this.emit('message', event)

    this.lastMessageReceived = time.getUnixTime()
    const encoder = this.retrieveMessage(new Uint8Array(event.data), true)
    if (encoding.length(encoder) > 1) {
      this.websocket.send(encoding.toUint8Array(encoder))
    }
  }

  onClose(event) {
    this.emit('close', event)

    this.websocket = null
    this.websocketConnecting = false
    if (this.websocketConnected) {
      this.websocketConnected = false
      this.synced = false
      // update awareness (all users except local left)
      awarenessProtocol.removeAwarenessStates(this.options.awareness, Array.from(this.options.awareness.getStates().keys()).filter(client => client !== this.options.document.clientID), this)
      this.emit('status', {
        status: 'disconnected',
      })
    } else {
      this.websocketConnectionAttempts += 1
    }

    if (this.shouldConnect) {
      const wait = math.min(
        math.log10(this.websocketConnectionAttempts + 1) * this.options.reconnectTimeoutBase,
        this.options.maxReconnectTimeout,
      )

      setTimeout(this.startWebSocketConnection.bind(this), wait)

      console.log(`Reconnecting in ${wait}ms …`)
    }
  }

  startWebSocketConnection() {
    // TODO: Still required?
    if (!this.shouldConnect) {
      return
    }

    if (this.websocket !== null) {
      return
    }

    this.websocket = new this.options.WebSocketPolyfill(this.url)
    this.websocket.binaryType = 'arraybuffer'

    this.websocketConnecting = true
    this.websocketConnected = false
    this.synced = false

    this.websocket.onmessage = this.onMessage.bind(this)
    this.websocket.onclose = this.onClose.bind(this)
    this.websocket.onopen = this.onOpen.bind(this)

    this.emit('status', {
      status: 'connecting',
    })
  }

  onOpen(event) {
    this.emit('open', event)
  }

  retrieveMessage(input: Uint8Array, emitSynced: boolean): encoding.Encoder {
    if (!this.websocketConnected) {
      this.retrievedFirstMessage()
    }

    return new IncomingMessage(input).handle(this, emitSynced)
  }

  retrievedFirstMessage() {
    this.lastMessageReceived = time.getUnixTime()
    this.websocketConnecting = false
    this.websocketConnected = true
    this.websocketConnectionAttempts = 0

    this.emit('status', {
      status: 'connected',
    })

    this.sendFirstSyncStep()
    this.broadcastLocalAwarenessState()
  }

  sendMessage(buffer: ArrayBuffer): void {
    if (this.websocket) {
      this.websocket.send(buffer)
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
    syncProtocol.writeSyncStep1(encoder, this.options.document)
    this.websocket.send(encoding.toUint8Array(encoder))
  }

  broadcastLocalAwarenessState() {
    if (this.options.awareness.getLocalState() === null) {
      return
    }

    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MessageTypes.Awareness)
    encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(this.options.awareness, [this.options.document.clientID]))
    this.websocket.send(encoding.toUint8Array(encoder))
  }
}
