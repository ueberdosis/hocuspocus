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
 * @param {WebsocketProvider} provider
 * @param {string} reason
 */
const permissionDeniedHandler = (provider, reason) => console.warn(`Permission denied to access ${provider.url}.\n${reason}`)

const messageSync = 0
const messageQueryAwareness = 3
const messageAwareness = 1
const messageAuth = 2

/**
 *                       encoder,          decoder,          provider,          emitSynced, messageType
 * @type {Array<function(encoding.Encoder, decoding.Decoder, WebsocketProvider, boolean,    number):void>}
 */
const messageHandlers = []

messageHandlers[messageSync] = (encoder, decoder, provider, emitSynced, messageType) => {
  encoding.writeVarUint(encoder, messageSync)
  const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, provider.doc, provider)
  if (emitSynced && syncMessageType === syncProtocol.messageYjsSyncStep2 && !provider.synced) {
    provider.synced = true
  }
}

messageHandlers[messageQueryAwareness] = (encoder, decoder, provider, emitSynced, messageType) => {
  encoding.writeVarUint(encoder, messageAwareness)
  encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(provider.awareness, Array.from(provider.awareness.getStates().keys())))
}

messageHandlers[messageAwareness] = (encoder, decoder, provider, emitSynced, messageType) => {
  awarenessProtocol.applyAwarenessUpdate(provider.awareness, decoding.readVarUint8Array(decoder), provider)
}

messageHandlers[messageAuth] = (encoder, decoder, provider, emitSynced, messageType) => {
  authProtocol.readAuthMessage(decoder, provider.doc, permissionDeniedHandler)
}

const reconnectTimeoutBase = 1200
const maxReconnectTimeout = 2500
// @todo - this should depend on awareness.outdatedTime
const messageReconnectTimeout = 30000

/**
 * Websocket Provider for Yjs. Creates a websocket connection to sync the shared document.
 * The document name is attached to the provided url. I.e. the following example
 * creates a websocket connection to http://localhost:1234/my-document-name
 *
 * @example
 *   import * as Y from 'yjs'
 *   import { WebsocketProvider } from 'y-websocket'
 *   const doc = new Y.Doc()
 *   const provider = new WebsocketProvider('http://localhost:1234', 'my-document-name', doc)
 *
 * @extends {Observable<string>}
 */
export class WebsocketProvider extends Observable {
  // settings = {
  //   serverUrl: null,
  //   documentName: '',
  //   doc: null,
  //   connect: true,
  //   awareness: null,
  //   parameters: {},
  //   WebSocketPolyfill: WebSocket,
  //   resyncInterval: -1,
  // }

  /**
   * @param {string} serverUrl
   * @param {string} documentName
   * @param {Y.Doc} doc
   * @param {object} [opts]
   * @param {boolean} [opts.connect]
   * @param {awarenessProtocol.Awareness} [opts.awareness]
   * @param {Object<string,string>} [opts.parameters]
   * @param {typeof WebSocket} [opts.WebSocketPolyfill] Optionall provide a WebSocket polyfill
   * @param {number} [opts.resyncInterval] Request server state every `resyncInterval` milliseconds
   */

  //  public options: EditorOptions = {

  // }
  // constructor(options: Partial<EditorOptions> = {}) {
  //   this.setOptions(options)
  // /**
  //  * Update editor options.
  //  *
  //  * @param options A list of options
  //  */
  // public setOptions(options: Partial<EditorOptions> = {}): void {
  //   this.options = { ...this.options, ...options }
  // }

  websocketConnected = false

  wsconnecting = false

  subscribedToBroadcastChannel = false

  wsUnsuccessfulReconnects = 0

  isSynced = false

  websocket: WebSocket = null

  lastMessageReceived = 0

  parameters = {}

  serverUrl = ''

  messageHandlers = messageHandlers.slice()

  mux = mutex.createMutex()

  constructor(
    serverUrl,
    documentName,
    doc,
    {
      connect = true,
      awareness = new awarenessProtocol.Awareness(doc),
      parameters = {},
      WebSocketPolyfill = WebSocket, resyncInterval = -1,
    } = {},
  ) {

    super()

    this.serverUrl = serverUrl
    this.parameters = parameters
    this.documentName = documentName
    this.doc = doc
    this.WS = WebSocketPolyfill
    this.awareness = awareness
    this.shouldConnect = connect

    /**
     * @type {number}
     */
    this.resyncInterval = 0
    if (resyncInterval > 0) {
      this.resyncInterval = /** @type {any} */ (setInterval(() => {
        if (this.websocket) {
          // resend sync step 1
          const encoder = encoding.createEncoder()
          encoding.writeVarUint(encoder, messageSync)
          syncProtocol.writeSyncStep1(encoder, doc)
          this.websocket.send(encoding.toUint8Array(encoder))
        }
      }, resyncInterval))
    }

    /**
     * @param {ArrayBuffer} data
     */
    this.broadcastChannelSubscriber = data => {
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
    this.updateHandler = (update, origin) => {
      if (origin !== this) {
        const encoder = encoding.createEncoder()
        encoding.writeVarUint(encoder, messageSync)
        syncProtocol.writeUpdate(encoder, update)
        this.broadcastMessage(encoding.toUint8Array(encoder))
      }
    }

    this.doc.on('update', this.updateHandler)

    /**
     * @param {any} changed
     * @param {any} origin
     */
    this.awarenessUpdateHandler = ({ added, updated, removed }, origin) => {
      const changedClients = added.concat(updated).concat(removed)
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, messageAwareness)
      encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients))
      this.broadcastMessage(encoding.toUint8Array(encoder))
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        awarenessProtocol.removeAwarenessStates(this.awareness, [doc.clientID], 'window unload')
      })
    }
    awareness.on('update', this.awarenessUpdateHandler)

    this.checkInterval = /** @type {any} */ (setInterval(() => {
      if (this.websocketConnected && messageReconnectTimeout < time.getUnixTime() - this.lastMessageReceived) {
        // no message received in a long time - not even your own awareness
        // updates (which are updated every 15 seconds)
        /** @type {WebSocket} */ (this.websocket).close()
      }
    }, messageReconnectTimeout / 10))

    if (connect) {
      this.connect()
    }
  }

  get normalizedServerUrl() {
  // ensure that url is always ends with /
    while (this.serverUrl[this.serverUrl.length - 1] === '/') {
      return this.serverUrl.slice(0, this.serverUrl.length - 1)
    }

    return this.serverUrl
  }

  get url() {
    const encodedParams = url.encodeQueryParams(this.parameters)

    return `${this.normalizedServerUrl}/${this.documentName}${encodedParams.length === 0 ? '' : `?${encodedParams}`}`
  }

  get broadcastChannel() {
    return `${this.normalizedServerUrl}/${this.documentName}`
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
    if (this.resyncInterval !== 0) {
      clearInterval(this.resyncInterval)
    }
    clearInterval(this.checkInterval)

    this.disconnect()
    this.awareness.off('update', this.awarenessUpdateHandler)
    this.doc.off('update', this.updateHandler)
    super.destroy()
  }

  subscribeToBroadcastChannel() {
    if (!this.subscribedToBroadcastChannel) {
      bc.subscribe(this.broadcoastChannel, this.broadcastChannelSubscriber)
      this.subscribedToBroadcastChannel = true
    }
    // send sync step1 to bc
    this.mux(() => {
      // write sync step 1
      const encoderSync = encoding.createEncoder()
      encoding.writeVarUint(encoderSync, messageSync)
      syncProtocol.writeSyncStep1(encoderSync, this.doc)
      bc.publish(this.broadcoastChannel, encoding.toUint8Array(encoderSync))

      // broadcast local state
      const encoderState = encoding.createEncoder()
      encoding.writeVarUint(encoderState, messageSync)
      syncProtocol.writeSyncStep2(encoderState, this.doc)
      bc.publish(this.broadcoastChannel, encoding.toUint8Array(encoderState))

      // write queryAwareness
      const encoderAwarenessQuery = encoding.createEncoder()
      encoding.writeVarUint(encoderAwarenessQuery, messageQueryAwareness)
      bc.publish(this.broadcoastChannel, encoding.toUint8Array(encoderAwarenessQuery))

      // broadcast local awareness state
      const encoderAwarenessState = encoding.createEncoder()
      encoding.writeVarUint(encoderAwarenessState, messageAwareness)
      encoding.writeVarUint8Array(encoderAwarenessState, awarenessProtocol.encodeAwarenessUpdate(this.awareness, [this.doc.clientID]))
      bc.publish(this.broadcoastChannel, encoding.toUint8Array(encoderAwarenessState))
    })
  }

  disconnectBroadcastChannel() {
    // broadcast message with local awareness state set to null (indicating disconnect)
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, messageAwareness)
    encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(this.awareness, [this.doc.clientID], new Map()))
    this.broadcastMessage(encoding.toUint8Array(encoder))

    if (this.subscribedToBroadcastChannel) {
      bc.unsubscribe(this.broadcoastChannel, this.broadcastChannelSubscriber)
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
    this.wsconnecting = false
    if (this.websocketConnected) {
      this.websocketConnected = false
      this.synced = false
      // update awareness (all users except local left)
      awarenessProtocol.removeAwarenessStates(this.awareness, Array.from(this.awareness.getStates().keys()).filter(client => client !== this.doc.clientID), this)
      this.emit('status', [{
        status: 'disconnected',
      }])
    } else {
      this.wsUnsuccessfulReconnects += 1
    }

    // TODO: `wsUnsuccessfulReconnects` is always 0
    setTimeout(
      this.setupWS,
      math.min(math.log10(this.wsUnsuccessfulReconnects + 1) * reconnectTimeoutBase, maxReconnectTimeout),
    )
  }

  onOpen(event) {
    console.log(event.type, { event })

    // TODO: That all happens to early, the connection can still get closed at this stage
    this.lastMessageReceived = time.getUnixTime()
    this.wsconnecting = false
    this.websocketConnected = true
    this.wsUnsuccessfulReconnects = 0
    this.emit('status', [{
      status: 'connected',
    }])

    this.sendFirstSyncStep()
    this.broadcastLocalAwarenessState()
  }

  broadcastLocalAwarenessState() {
    if (this.awareness.getLocalState() === null) {
      return false
    }

    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, messageAwareness)
    encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(this.awareness, [this.doc.clientID]))
    this.websocket.send(encoding.toUint8Array(encoder))
  }

  sendFirstSyncStep() {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, messageSync)
    syncProtocol.writeSyncStep1(encoder, this.doc)
    this.websocket.send(encoding.toUint8Array(encoder))
  }

  setupWS() {
    if (!this.shouldConnect) {
      return false
    }

    if (this.websocket !== null) {
      return false
    }

    this.websocket = new this.WS(this.url)
    this.websocket.binaryType = 'arraybuffer'

    this.wsconnecting = true
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
   * @param {WebsocketProvider} provider
   * @param {Uint8Array} buf
   * @param {boolean} emitSynced
   * @return {encoding.Encoder}
   */
  readMessage(buf, emitSynced) {
    const decoder = decoding.createDecoder(buf)
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
   * @param {WebsocketProvider} provider
   * @param {ArrayBuffer} buf
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
