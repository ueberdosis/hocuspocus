// @ts-nocheck
import * as Y from 'yjs'
import * as bc from 'lib0/broadcastchannel'
import * as time from 'lib0/time'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import * as syncProtocol from 'y-protocols/sync'
import * as authProtocol from 'y-protocols/auth'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as mutex from 'lib0/mutex'
import { Observable } from 'lib0/observable'
import * as math from 'lib0/math'
import * as url from 'lib0/url'

/**
 * @param {HocuspocusClient} provider
 * @param {string} reason
 */
const permissionDeniedHandler = (provider, reason) => console.warn(`Permission denied to access ${provider.url}.\n${reason}`)

const messageSync = 0
const messageQueryAwareness = 3
const messageAwareness = 1
const messageAuth = 2

/**
 *                       encoder,          decoder,          provider,          emitSynced, messageType
 * @type {Array<function(encoding.Encoder, decoding.Decoder, HocuspocusClient, boolean,    number):void>}
 */
const messageHandlers = []

messageHandlers[messageSync] = (encoder, decoder, provider, emitSynced, messageType) => {
  encoding.writeVarUint(encoder, messageSync)
  const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, provider.options.document, provider)
  if (emitSynced && syncMessageType === syncProtocol.messageYjsSyncStep2 && !provider.synced) {
    provider.synced = true
  }
}

messageHandlers[messageQueryAwareness] = (encoder, decoder, provider, emitSynced, messageType) => {
  encoding.writeVarUint(encoder, messageAwareness)
  encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(provider.options.awareness, Array.from(provider.options.awareness.getStates().keys())))
}

messageHandlers[messageAwareness] = (encoder, decoder, provider, emitSynced, messageType) => {
  awarenessProtocol.applyAwarenessUpdate(provider.options.awareness, decoding.readVarUint8Array(decoder), provider)
}

messageHandlers[messageAuth] = (encoder, decoder, provider, emitSynced, messageType) => {
  authProtocol.readAuthMessage(decoder, provider.options.document, permissionDeniedHandler)
}

export interface HocuspocusClientOptions {
  url: string,
  name: string,
  document: Y.Doc,
  connect: boolean,
  awareness: awarenessProtocol.Awareness,
  parameters: Object<string, string>,
  WebSocketPolyfill: WebSocket,
  forceSyncInterval: false | number,
}

export class HocuspocusClient extends Observable {
  public options: HocuspocusClientOptions = {
    url: null,
    name: null,
    document: null,
    connect: true,
    awareness: null,
    parameters: {},
    WebSocketPolyfill: WebSocket,
    forceSyncInterval: false,
    reconnectTimeoutBase: 1200,
    maxReconnectTimeout: 2500,
    // @todo - this should depend on awareness.outdatedTime
    messageReconnectTimeout: 30000,
  }

  websocket: WebSocket = null

  websocketConnecting = false

  websocketConnected = false

  websocketConnectionAttempts = 0

  subscribedToBroadcastChannel = false

  isSynced = false

  lastMessageReceived = 0

  messageHandlers = messageHandlers.slice()

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

    if (this.options.forceSyncInterval) {
      this.intervals.forceSync = setInterval(
        this.forceSync.bind(this),
        this.options.forceSyncInterval,
      )
    }

    this.connectionChecker = setInterval(
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
    encoding.writeVarUint(encoder, messageSync)
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
      const encoder = this.readMessage(new Uint8Array(data), false)
      if (encoding.length(encoder) > 1) {
        bc.publish(this.broadcoastChannel, encoding.toUint8Array(encoder))
      }
    })
  }

  /**
   * Listens to Yjs updates and sends them to remote peers (ws and broadcastchannel)
   * @param {Uint8Array} update
   * @param {any} origin
   */
  updateHandler(update, origin) {
    if (origin === this) {
      return
    }

    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, messageSync)
    syncProtocol.writeUpdate(encoder, update)

    this.broadcastMessage(encoding.toUint8Array(encoder))
  }

  /**
   * @param {any} changed
   * @param {any} origin
   */
  awarenessUpdateHandler({ added, updated, removed }, origin) {
    const changedClients = added.concat(updated).concat(removed)

    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, messageAwareness)
    encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(this.options.awareness, changedClients))

    this.broadcastMessage(encoding.toUint8Array(encoder))
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
    this.emit('synced', [state])
    this.emit('sync', [state])
  }

  destroy() {
    if (this.intervals.forceSync) {
      clearInterval(this.intervals.forceSync)
    }
    clearInterval(this.connectionChecker)

    this.disconnect()
    this.options.awareness.off('update', this.awarenessUpdateHandler)
    this.options.document.off('update', this.updateHandler)
    super.destroy()
  }

  subscribeToBroadcastChannel() {
    if (!this.subscribedToBroadcastChannel) {
      bc.subscribe(this.broadcoastChannel, this.broadcastChannelSubscriber.bind(this))
      this.subscribedToBroadcastChannel = true
    }

    // send sync step1 to bc
    this.mux(() => {
      // write sync step 1
      const encoderSync = encoding.createEncoder()
      encoding.writeVarUint(encoderSync, messageSync)
      syncProtocol.writeSyncStep1(encoderSync, this.options.document)
      bc.publish(this.broadcoastChannel, encoding.toUint8Array(encoderSync))

      // broadcast local state
      const encoderState = encoding.createEncoder()
      encoding.writeVarUint(encoderState, messageSync)
      syncProtocol.writeSyncStep2(encoderState, this.options.document)
      bc.publish(this.broadcoastChannel, encoding.toUint8Array(encoderState))

      // write queryAwareness
      const encoderAwarenessQuery = encoding.createEncoder()
      encoding.writeVarUint(encoderAwarenessQuery, messageQueryAwareness)
      bc.publish(this.broadcoastChannel, encoding.toUint8Array(encoderAwarenessQuery))

      // broadcast local awareness state
      const encoderAwarenessState = encoding.createEncoder()
      encoding.writeVarUint(encoderAwarenessState, messageAwareness)
      encoding.writeVarUint8Array(encoderAwarenessState, awarenessProtocol.encodeAwarenessUpdate(this.options.awareness, [this.options.document.clientID]))
      bc.publish(this.broadcoastChannel, encoding.toUint8Array(encoderAwarenessState))
    })
  }

  disconnectBroadcastChannel() {
    // broadcast message with local awareness state set to null (indicating disconnect)
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, messageAwareness)
    encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(this.options.awareness, [this.options.document.clientID], new Map()))
    this.broadcastMessage(encoding.toUint8Array(encoder))

    if (this.subscribedToBroadcastChannel) {
      bc.unsubscribe(this.broadcoastChannel, this.broadcastChannelSubscriber.bind(this))
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
      this.setupWS()
      this.subscribeToBroadcastChannel()
    }
  }

  onMessage(event) {
    console.log(event.type, { event })

    this.lastMessageReceived = time.getUnixTime()
    const encoder = this.readMessage(new Uint8Array(event.data), true)
    if (encoding.length(encoder) > 1) {
      this.websocket.send(encoding.toUint8Array(encoder))
    }
  }

  onClose(event) {
    console.log(event.type, event.code, event.reason, { event })

    this.websocket = null
    this.websocketConnecting = false
    if (this.websocketConnected) {
      this.websocketConnected = false
      this.synced = false
      // update awareness (all users except local left)
      awarenessProtocol.removeAwarenessStates(this.options.awareness, Array.from(this.options.awareness.getStates().keys()).filter(client => client !== this.options.document.clientID), this)
      this.emit('status', [{
        status: 'disconnected',
      }])
    } else {
      this.websocketConnectionAttempts += 1
    }

    // TODO: `websocketConnectionAttempts` is always 0
    setTimeout(
      this.setupWS,
      math.min(math.log10(this.websocketConnectionAttempts + 1) * this.options.reconnectTimeoutBase, this.options.maxReconnectTimeout),
    )
  }

  onOpen(event) {
    console.log(event.type, { event })

    // TODO: That all happens to early, the connection can still get closed at this stage
    this.lastMessageReceived = time.getUnixTime()
    this.websocketConnecting = false
    this.websocketConnected = true
    this.websocketConnectionAttempts = 0
    this.emit('status', [{
      status: 'connected',
    }])

    this.sendFirstSyncStep()
    this.broadcastLocalAwarenessState()
  }

  broadcastLocalAwarenessState() {
    if (this.options.awareness.getLocalState() === null) {
      return
    }

    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, messageAwareness)
    encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(this.options.awareness, [this.options.document.clientID]))
    this.websocket.send(encoding.toUint8Array(encoder))
  }

  sendFirstSyncStep() {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, messageSync)
    syncProtocol.writeSyncStep1(encoder, this.options.document)
    this.websocket.send(encoding.toUint8Array(encoder))
  }

  setupWS() {
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

    this.emit('status', [{
      status: 'connecting',
    }])
  }

  /**
   * @param {HocuspocusClient} provider
   * @param {Uint8Array} buffer
   * @param {boolean} emitSynced
   * @return {encoding.Encoder}
   */
  readMessage(buffer, emitSynced) {
    const decoder = decoding.createDecoder(buffer)
    const encoder = encoding.createEncoder()
    const messageType = decoding.readVarUint(decoder)
    const messageHandler = this.messageHandlers[messageType]

    if (/** @type {any} */ (messageHandler)) {
      messageHandler(encoder, decoder, this, emitSynced, messageType)
    } else {
      console.error('Unable to compute message')
    }
    return encoder
  }

  /**
   * @param {HocuspocusClient} provider
   * @param {ArrayBuffer} buffer
   */
  broadcastMessage(buffer) {
    if (this.websocketConnected) {
      /** @type {WebSocket} */ (this.websocket).send(buffer)
    }

    if (this.subscribedToBroadcastChannel) {
      this.mux(() => {
        bc.publish(this.broadcoastChannel, buffer)
      })
    }
  }
}
