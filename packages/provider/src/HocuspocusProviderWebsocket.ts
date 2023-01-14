import { time } from 'lib0'
import { retry } from '@lifeomic/attempt'
import { WebSocketStatus } from './types'
import EventEmitter from './EventEmitter'
import { CompleteHocuspocusProviderConfiguration } from './HocuspocusProvider'

export class HocuspocusProviderWebsocket extends EventEmitter {

  public configuration: CompleteHocuspocusProviderConfiguration = {
    name: '',
    url: '',
    // @ts-ignore
    document: undefined,
    // @ts-ignore
    awareness: undefined,
    WebSocketPolyfill: undefined,
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
    quiet: false,
  }

  connectionAttempt: {
    resolve: (value?: any) => void
    reject: (reason?: any) => void
  } | null = null

  shouldConnect = true

  intervals: any = {
    connectionChecker: null,
  }

  status = WebSocketStatus.Disconnected

  webSocket: WebSocket | null = null

  cancelWebsocketRetry?: () => void

  constructor() {
    super()

    this.configuration.WebSocketPolyfill = configuration.WebSocketPolyfill ? configuration.WebSocketPolyfill : WebSocket

    this.on('open', this.configuration.onOpen)
    this.on('disconnect', this.configuration.onDisconnect)
    this.on('close', this.configuration.onClose)

    if (typeof configuration.connect !== 'undefined') {
      this.shouldConnect = configuration.connect
    }

    this.intervals.connectionChecker = setInterval(
      this.checkConnection.bind(this),
      this.configuration.messageReconnectTimeout / 10,
    )

    if (!this.shouldConnect) return

    this.connect()
  }

  boundConnect = this.connect.bind(this)

  registerEventListeners() {
    if (typeof window === 'undefined') {
      return
    }

    window.addEventListener('online', this.boundConnect)
  }

  async connect() {
    if (this.status === WebSocketStatus.Connected) {
      return
    }

    // Always cancel any previously initiated connection retryer instances
    if (this.cancelWebsocketRetry) {
      this.cancelWebsocketRetry()
      this.cancelWebsocketRetry = undefined
    }

    this.unsyncedChanges = 0 // set to 0 in case we got reconnected
    this.shouldConnect = true
    this.subscribeToBroadcastChannel()

    const abortableRetry = () => {
      let cancelAttempt = false

      const retryPromise = retry(this.createWebSocketConnection.bind(this), {
        delay: this.configuration.delay,
        initialDelay: this.configuration.initialDelay,
        factor: this.configuration.factor,
        maxAttempts: this.configuration.maxAttempts,
        minDelay: this.configuration.minDelay,
        maxDelay: this.configuration.maxDelay,
        jitter: this.configuration.jitter,
        timeout: this.configuration.timeout,
        beforeAttempt: context => {
          if (!this.shouldConnect || cancelAttempt) {
            context.abort()
          }
        },
      }).catch((error: any) => {
        // If we aborted the connection attempt then don’t throw an error
        // ref: https://github.com/lifeomic/attempt/blob/master/src/index.ts#L136
        if (error && error.code !== 'ATTEMPT_ABORTED') {
          throw error
        }
      })

      return {
        retryPromise,
        cancelFunc: () => {
          cancelAttempt = true
        },
      }
    }

    const { retryPromise, cancelFunc } = abortableRetry()
    this.cancelWebsocketRetry = cancelFunc

    return retryPromise
  }

  createWebSocketConnection() {
    return new Promise((resolve, reject) => {
      if (this.webSocket) {
        this.webSocket.close()
        this.webSocket = null
      }

      // Init the WebSocket connection
      const ws = new this.configuration.WebSocketPolyfill(this.url)
      ws.binaryType = 'arraybuffer'
      // ws.onmessage = this.onMessage.bind(this)
      ws.onclose = this.onClose.bind(this)
      ws.onopen = this.onOpen.bind(this)
      ws.onerror = (err: any) => {
        reject(err)
      }
      this.webSocket = ws

      // Reset the status
      this.synced = false
      this.status = WebSocketStatus.Connecting
      this.emit('status', { status: WebSocketStatus.Connecting })

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

    this.status = WebSocketStatus.Connected
    this.emit('status', { status: WebSocketStatus.Connected })
    this.emit('connect')
  }

  stopConnectionAttempt() {
    this.connectionAttempt = null
  }

  rejectConnectionAttempt() {
    this.connectionAttempt?.reject()
    this.connectionAttempt = null
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
    if (this.configuration.messageReconnectTimeout >= time.getUnixTime() - this.lastMessageReceived) {
      return
    }

    // No message received in a long time, not even your own
    // Awareness updates, which are updated every 15 seconds.
    this.webSocket?.close()
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
}
