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
 * @param {WebsocketProvider} provider
 * @param {Uint8Array} buf
 * @param {boolean} emitSynced
 * @return {encoding.Encoder}
 */
const readMessage = (provider, buf, emitSynced) => {
  const decoder = decoding.createDecoder(buf)
  const encoder = encoding.createEncoder()
  const messageType = decoding.readVarUint(decoder)
  const messageHandler = provider.messageHandlers[messageType]
  if (/** @type {any} */ (messageHandler)) {
    messageHandler(encoder, decoder, provider, emitSynced, messageType)
  } else {
    console.error('Unable to compute message')
  }
  return encoder
}

/**
 * @param {WebsocketProvider} provider
 * @param {ArrayBuffer} buf
 */
const broadcastMessage = (provider, buf) => {
  if (provider.wsconnected) {
    /** @type {WebSocket} */ (provider.connection).send(buf)
  }
  if (provider.bcconnected) {
    provider.mux(() => {
      bc.publish(provider.bcChannel, buf)
    })
  }
}

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
  //   roomname: '',
  //   doc: null,
  //   connect: true,
  //   awareness: null,
  //   params: {},
  //   WebSocketPolyfill: WebSocket,
  //   resyncInterval: -1,
  // }

  /**
   * @param {string} serverUrl
   * @param {string} roomname
   * @param {Y.Doc} doc
   * @param {object} [opts]
   * @param {boolean} [opts.connect]
   * @param {awarenessProtocol.Awareness} [opts.awareness]
   * @param {Object<string,string>} [opts.params]
   * @param {typeof WebSocket} [opts.WebSocketPolyfill] Optionall provide a WebSocket polyfill
   * @param {number} [opts.resyncInterval] Request server state every `resyncInterval` milliseconds
   */

  constructor(serverUrl, roomname, doc, {
    connect = true, awareness = new awarenessProtocol.Awareness(doc), params = {}, WebSocketPolyfill = WebSocket, resyncInterval = -1,
  } = {}) {
    super()
    // ensure that url is always ends with /
    while (serverUrl[serverUrl.length - 1] === '/') {
      serverUrl = serverUrl.slice(0, serverUrl.length - 1)
    }
    const encodedParams = url.encodeQueryParams(params)
    this.bcChannel = `${serverUrl}/${roomname}`
    this.url = `${serverUrl}/${roomname}${encodedParams.length === 0 ? '' : `?${encodedParams}`}`
    this.roomname = roomname
    this.doc = doc
    this.WS = WebSocketPolyfill
    this.awareness = awareness
    this.wsconnected = false
    this.wsconnecting = false
    this.bcconnected = false
    this.wsUnsuccessfulReconnects = 0
    this.messageHandlers = messageHandlers.slice()
    this.mux = mutex.createMutex()
    /**
     * @type {boolean}
     */
    this.isSynced = false
    /**
     * @type {WebSocket?}
     */
    this.connection = null
    this.wsLastMessageReceived = 0
    /**
     * Whether to connect to other peers or not
     * @type {boolean}
     */
    this.shouldConnect = connect

    /**
     * @type {number}
     */
    this.resyncInterval = 0
    if (resyncInterval > 0) {
      this.resyncInterval = /** @type {any} */ (setInterval(() => {
        if (this.connection) {
          // resend sync step 1
          const encoder = encoding.createEncoder()
          encoding.writeVarUint(encoder, messageSync)
          syncProtocol.writeSyncStep1(encoder, doc)
          this.connection.send(encoding.toUint8Array(encoder))
        }
      }, resyncInterval))
    }

    /**
     * @param {ArrayBuffer} data
     */
    this.bcSubscriber = data => {
      this.mux(() => {
        const encoder = readMessage(this, new Uint8Array(data), false)
        if (encoding.length(encoder) > 1) {
          bc.publish(this.bcChannel, encoding.toUint8Array(encoder))
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
        broadcastMessage(this, encoding.toUint8Array(encoder))
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
      broadcastMessage(this, encoding.toUint8Array(encoder))
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        awarenessProtocol.removeAwarenessStates(this.awareness, [doc.clientID], 'window unload')
      })
    }
    awareness.on('update', this.awarenessUpdateHandler)
    this.checkInterval = /** @type {any} */ (setInterval(() => {
      if (this.wsconnected && messageReconnectTimeout < time.getUnixTime() - this.wsLastMessageReceived) {
        // no message received in a long time - not even your own awareness
        // updates (which are updated every 15 seconds)
        /** @type {WebSocket} */ (this.connection).close()
      }
    }, messageReconnectTimeout / 10))
    if (connect) {
      this.connect()
    }
  }

  /**
   * @type {boolean}
   */
  get synced() {
    return this.isSynced
  }

  set synced(state) {
    if (this.isSynced !== state) {
      this.isSynced = state
      this.emit('synced', [state])
      this.emit('sync', [state])
    }
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

  connectBc() {
    if (!this.bcconnected) {
      bc.subscribe(this.bcChannel, this.bcSubscriber)
      this.bcconnected = true
    }
    // send sync step1 to bc
    this.mux(() => {
      // write sync step 1
      const encoderSync = encoding.createEncoder()
      encoding.writeVarUint(encoderSync, messageSync)
      syncProtocol.writeSyncStep1(encoderSync, this.doc)
      bc.publish(this.bcChannel, encoding.toUint8Array(encoderSync))
      // broadcast local state
      const encoderState = encoding.createEncoder()
      encoding.writeVarUint(encoderState, messageSync)
      syncProtocol.writeSyncStep2(encoderState, this.doc)
      bc.publish(this.bcChannel, encoding.toUint8Array(encoderState))
      // write queryAwareness
      const encoderAwarenessQuery = encoding.createEncoder()
      encoding.writeVarUint(encoderAwarenessQuery, messageQueryAwareness)
      bc.publish(this.bcChannel, encoding.toUint8Array(encoderAwarenessQuery))
      // broadcast local awareness state
      const encoderAwarenessState = encoding.createEncoder()
      encoding.writeVarUint(encoderAwarenessState, messageAwareness)
      encoding.writeVarUint8Array(encoderAwarenessState, awarenessProtocol.encodeAwarenessUpdate(this.awareness, [this.doc.clientID]))
      bc.publish(this.bcChannel, encoding.toUint8Array(encoderAwarenessState))
    })
  }

  disconnectBroadcastChannel() {
    // broadcast message with local awareness state set to null (indicating disconnect)
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, messageAwareness)
    encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(this.awareness, [this.doc.clientID], new Map()))
    broadcastMessage(this, encoding.toUint8Array(encoder))
    if (this.bcconnected) {
      bc.unsubscribe(this.bcChannel, this.bcSubscriber)
      this.bcconnected = false
    }
  }

  disconnect() {
    this.shouldConnect = false
    this.disconnectBroadcastChannel()

    if (this.connection === null) {
      return
    }

    this.connection.close()
  }

  connect() {
    this.shouldConnect = true
    if (!this.wsconnected && this.connection === null) {
      this.setupWS()
      this.connectBc()
    }
  }

  onMessage(event) {
    console.log(event.type, { event })

    this.wsLastMessageReceived = time.getUnixTime()
    const encoder = readMessage(this, new Uint8Array(event.data), true)
    if (encoding.length(encoder) > 1) {
      this.connection.send(encoding.toUint8Array(encoder))
    }
  }

  onClose(event) {
    console.log(event.type, event.code, event.reason, { event })

    this.connection = null
    this.wsconnecting = false
    if (this.wsconnected) {
      this.wsconnected = false
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
    this.wsLastMessageReceived = time.getUnixTime()
    this.wsconnecting = false
    this.wsconnected = true
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

    const encoderAwarenessState = encoding.createEncoder()
    encoding.writeVarUint(encoderAwarenessState, messageAwareness)
    encoding.writeVarUint8Array(encoderAwarenessState, awarenessProtocol.encodeAwarenessUpdate(this.awareness, [this.doc.clientID]))
    this.connection.send(encoding.toUint8Array(encoderAwarenessState))
  }

  sendFirstSyncStep() {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, messageSync)
    syncProtocol.writeSyncStep1(encoder, this.doc)
    this.connection.send(encoding.toUint8Array(encoder))
  }

  setupWS() {
    if (!this.shouldConnect) {
      return false
    }

    if (this.connection !== null) {
      return false
    }

    this.connection = new this.WS(this.url)
    this.connection.binaryType = 'arraybuffer'

    this.wsconnecting = true
    this.wsconnected = false
    this.synced = false

    this.connection.onmessage = this.onMessage.bind(this)
    this.connection.onclose = this.onClose.bind(this)
    this.connection.onopen = this.onOpen.bind(this)

    this.emit('status', [{
      status: 'connecting',
    }])
  }

}
