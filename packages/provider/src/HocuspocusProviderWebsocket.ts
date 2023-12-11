import {
  Forbidden, MessageTooBig, Unauthorized, WsReadyStates,
} from '@hocuspocus/common'
import { retry } from '@lifeomic/attempt'
import * as time from 'lib0/time'
import * as url from 'lib0/url'
import type { MessageEvent } from 'ws'
import { Event } from 'ws'
import EventEmitter from './EventEmitter.js'
import { HocuspocusProvider } from './HocuspocusProvider.js'
import {
  WebSocketStatus,
  onAwarenessChangeParameters, onAwarenessUpdateParameters,
  onCloseParameters, onDisconnectParameters, onMessageParameters, onOpenParameters, onOutgoingMessageParameters, onStatusParameters,
} from './types.js'
import { IncomingMessage } from './IncomingMessage.js'

export type HocusPocusWebSocket = WebSocket & { identifier: string };

export type HocuspocusProviderWebsocketConfiguration =
  Required<Pick<CompleteHocuspocusProviderWebsocketConfiguration, 'url'>>
  & Partial<CompleteHocuspocusProviderWebsocketConfiguration>

export interface CompleteHocuspocusProviderWebsocketConfiguration {
  /**
   * URL of your @hocuspocus/server instance
   */
   url: string,

  /**
   * Pass `false` to start the connection manually.
   */
  connect: boolean,

  /**
   * URL parameters that should be added.
   */
  parameters: { [key: string]: any },
  /**
   * An optional WebSocket polyfill, for example for Node.js
   */
  WebSocketPolyfill: any,

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
  onOpen: (data: onOpenParameters) => void,
  onConnect: () => void,
  onMessage: (data: onMessageParameters) => void,
  onOutgoingMessage: (data: onOutgoingMessageParameters) => void,
  onStatus: (data: onStatusParameters) => void,
  onDisconnect: (data: onDisconnectParameters) => void,
  onClose: (data: onCloseParameters) => void,
  onDestroy: () => void,
  onAwarenessUpdate: (data: onAwarenessUpdateParameters) => void,
  onAwarenessChange: (data: onAwarenessChangeParameters) => void,
  /**
   * Don’t output any warnings.
   */
  quiet: boolean,

  /**
   * Map of attached providers keyed by documentName.
   */
  providerMap: Map<string, HocuspocusProvider>,
}

export class HocuspocusProviderWebsocket extends EventEmitter {
  private messageQueue: any[] = []

  public configuration: CompleteHocuspocusProviderWebsocketConfiguration = {
    url: '',
    // @ts-ignore
    document: undefined,
    WebSocketPolyfill: undefined,
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
    onOpen: () => null,
    onConnect: () => null,
    onMessage: () => null,
    onOutgoingMessage: () => null,
    onStatus: () => null,
    onDisconnect: () => null,
    onClose: () => null,
    onDestroy: () => null,
    onAwarenessUpdate: () => null,
    onAwarenessChange: () => null,
    quiet: false,
    providerMap: new Map(),
  }

  webSocket: HocusPocusWebSocket | null = null

  webSocketHandlers: { [key: string]: any } = {}

  shouldConnect = true

  status = WebSocketStatus.Disconnected

  lastMessageReceived = 0

  identifier = 0

  intervals: any = {
    forceSync: null,
    connectionChecker: null,
  }

  connectionAttempt: {
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
  } | null = null

  constructor(configuration: HocuspocusProviderWebsocketConfiguration) {
    super()
    this.setConfiguration(configuration)

    this.configuration.WebSocketPolyfill = configuration.WebSocketPolyfill
      ? configuration.WebSocketPolyfill
      : WebSocket

    this.on('open', this.configuration.onOpen)
    this.on('open', this.onOpen.bind(this))
    this.on('connect', this.configuration.onConnect)
    this.on('message', this.configuration.onMessage)
    this.on('outgoingMessage', this.configuration.onOutgoingMessage)
    this.on('status', this.configuration.onStatus)
    this.on('status', this.onStatus.bind(this))
    this.on('disconnect', this.configuration.onDisconnect)
    this.on('close', this.configuration.onClose)
    this.on('destroy', this.configuration.onDestroy)
    this.on('awarenessUpdate', this.configuration.onAwarenessUpdate)
    this.on('awarenessChange', this.configuration.onAwarenessChange)

    this.on('close', this.onClose.bind(this))
    this.on('message', this.onMessage.bind(this))

    this.intervals.connectionChecker = setInterval(
      this.checkConnection.bind(this),
      this.configuration.messageReconnectTimeout / 10,
    )

    if (typeof configuration.connect !== 'undefined') {
      this.shouldConnect = configuration.connect
    }

    if (!this.shouldConnect) {
      return
    }

    this.connect()
  }

  receivedOnOpenPayload?: Event | undefined = undefined

  receivedOnStatusPayload?: onStatusParameters | undefined = undefined

  async onOpen(event: Event) {
    this.receivedOnOpenPayload = event
  }

  async onStatus(data: onStatusParameters) {
    this.receivedOnStatusPayload = data
  }

  attach(provider: HocuspocusProvider) {
    this.configuration.providerMap.set(provider.configuration.name, provider)

    if (this.status === WebSocketStatus.Disconnected && this.shouldConnect) {
      this.connect()
    }

    if (this.receivedOnOpenPayload) {
      provider.onOpen(this.receivedOnOpenPayload)
    }

    if (this.receivedOnStatusPayload) {
      provider.onStatus(this.receivedOnStatusPayload)
    }
  }

  detach(provider: HocuspocusProvider) {
    this.configuration.providerMap.delete(provider.configuration.name)
  }

  public setConfiguration(
    configuration: Partial<HocuspocusProviderWebsocketConfiguration> = {},
  ): void {
    this.configuration = { ...this.configuration, ...configuration }
  }

  cancelWebsocketRetry?: () => void

  async connect() {
    if (this.status === WebSocketStatus.Connected) {
      return
    }

    // Always cancel any previously initiated connection retryer instances
    if (this.cancelWebsocketRetry) {
      this.cancelWebsocketRetry()
      this.cancelWebsocketRetry = undefined
    }

    this.receivedOnOpenPayload = undefined
    this.receivedOnStatusPayload = undefined
    this.shouldConnect = true

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

  attachWebSocketListeners(ws: HocusPocusWebSocket, reject: Function) {
    const { identifier } = ws
    const onMessageHandler = (payload: any) => this.emit('message', payload)
    const onCloseHandler = (payload: any) => this.emit('close', { event: payload })
    const onOpenHandler = (payload: any) => this.emit('open', payload)
    const onErrorHandler = (err: any) => {
      reject(err)
    }

    this.webSocketHandlers[identifier] = {
      message: onMessageHandler,
      close: onCloseHandler,
      open: onOpenHandler,
      error: onErrorHandler,
    }

    const handlers = this.webSocketHandlers[ws.identifier]

    Object.keys(handlers).forEach(name => {
      ws.addEventListener(name, handlers[name])
    })
  }

  cleanupWebSocket() {
    if (!this.webSocket) {
      return
    }
    const { identifier } = this.webSocket
    const handlers = this.webSocketHandlers[identifier]

    Object.keys(handlers).forEach(name => {
      this.webSocket?.removeEventListener(name, handlers[name])
      delete this.webSocketHandlers[identifier]
    })
    this.webSocket.close()
    this.webSocket = null
  }

  createWebSocketConnection() {
    return new Promise((resolve, reject) => {
      if (this.webSocket) {
        this.messageQueue = []
        this.cleanupWebSocket()
      }
      this.lastMessageReceived = 0
      this.identifier += 1

      // Init the WebSocket connection
      const ws = new this.configuration.WebSocketPolyfill(this.url)
      ws.binaryType = 'arraybuffer'
      ws.identifier = this.identifier

      this.attachWebSocketListeners(ws, reject)

      this.webSocket = ws

      // Reset the status
      this.status = WebSocketStatus.Connecting
      this.emit('status', { status: WebSocketStatus.Connecting })

      // Store resolve/reject for later use
      this.connectionAttempt = {
        resolve,
        reject,
      }
    })
  }

  onMessage(event: MessageEvent) {
    this.resolveConnectionAttempt()

    this.lastMessageReceived = time.getUnixTime()

    const message = new IncomingMessage(event.data)
    const documentName = message.peekVarString()

    this.configuration.providerMap.get(documentName)?.onMessage(event)
  }

  resolveConnectionAttempt() {
    if (this.connectionAttempt) {
      this.connectionAttempt.resolve()
      this.connectionAttempt = null

      this.status = WebSocketStatus.Connected
      this.emit('status', { status: WebSocketStatus.Connected })
      this.emit('connect')
      this.messageQueue.forEach(message => this.send(message))
      this.messageQueue = []
    }
  }

  stopConnectionAttempt() {
    this.connectionAttempt = null
  }

  rejectConnectionAttempt() {
    this.connectionAttempt?.reject()
    this.connectionAttempt = null
  }

  closeTries = 0

  checkConnection() {
    // Don’t check the connection when it’s not even established
    if (this.status !== WebSocketStatus.Connected) {
      return
    }

    // Don’t close the connection while waiting for the first message
    if (!this.lastMessageReceived) {
      return
    }

    // Don’t close the connection when a message was received recently
    if (
      this.configuration.messageReconnectTimeout
      >= time.getUnixTime() - this.lastMessageReceived
    ) {
      return
    }

    // No message received in a long time, not even your own
    // Awareness updates, which are updated every 15 seconds
    // if awareness is enabled.
    this.closeTries += 1
    // https://bugs.webkit.org/show_bug.cgi?id=247943
    if (this.closeTries > 2) {
      this.onClose({
        event: {
          code: 4408,
          reason: 'forced',
        },
      })
      this.closeTries = 0
    } else {
      this.webSocket?.close()
      this.messageQueue = []
    }
  }

  // Ensure that the URL always ends with /
  get serverUrl() {
    while (this.configuration.url[this.configuration.url.length - 1] === '/') {
      return this.configuration.url.slice(0, this.configuration.url.length - 1)
    }

    return this.configuration.url
  }

  get url() {
    const encodedParams = url.encodeQueryParams(this.configuration.parameters)

    return `${this.serverUrl}${encodedParams.length === 0 ? '' : `?${encodedParams}`}`
  }

  disconnect() {
    this.shouldConnect = false

    if (this.webSocket === null) {
      return
    }

    try {
      this.webSocket.close()
      this.messageQueue = []
    } catch {
      //
    }
  }

  send(message: any) {
    if (this.webSocket?.readyState === WsReadyStates.Open) {
      this.webSocket.send(message)
    } else {
      this.messageQueue.push(message)
    }
  }

  onClose({ event }: onCloseParameters) {
    this.closeTries = 0
    this.cleanupWebSocket()

    if (this.status === WebSocketStatus.Connected) {
      this.status = WebSocketStatus.Disconnected
      this.emit('status', { status: WebSocketStatus.Disconnected })
      this.emit('disconnect', { event })
    }

    if (event.code === Unauthorized.code) {
      if (event.reason === Unauthorized.reason) {
        console.warn(
          '[HocuspocusProvider] An authentication token is required, but you didn’t send one. Try adding a `token` to your HocuspocusProvider configuration. Won’t try again.',
        )
      } else {
        console.warn(
          `[HocuspocusProvider] Connection closed with status Unauthorized: ${event.reason}`,
        )
      }

      this.shouldConnect = false
    }

    if (event.code === Forbidden.code) {
      if (!this.configuration.quiet) {
        console.warn(
          '[HocuspocusProvider] The provided authentication token isn’t allowed to connect to this server. Will try again.',
        )
        return // TODO REMOVE ME
      }
    }

    if (event.code === MessageTooBig.code) {
      console.warn(
        `[HocuspocusProvider] Connection closed with status MessageTooBig: ${event.reason}`,
      )
      this.shouldConnect = false
    }

    if (this.connectionAttempt) {
      // That connection attempt failed.
      this.rejectConnectionAttempt()
    } else if (this.shouldConnect) {
      // The connection was closed by the server. Let’s just try again.
      this.connect()
    }

    // If we’ll reconnect, we’re done for now.
    if (this.shouldConnect) {
      return
    }

    // The status is set correctly already.
    if (this.status === WebSocketStatus.Disconnected) {
      return
    }

    // Let’s update the connection status.
    this.status = WebSocketStatus.Disconnected
    this.emit('status', { status: WebSocketStatus.Disconnected })
    this.emit('disconnect', { event })
  }

  destroy() {
    this.emit('destroy')

    if (this.intervals.forceSync) {
      clearInterval(this.intervals.forceSync)
    }

    clearInterval(this.intervals.connectionChecker)

    // If there is still a connection attempt outstanding then we should stop
    // it before calling disconnect, otherwise it will be rejected in the onClose
    // handler and trigger a retry
    this.stopConnectionAttempt()

    this.disconnect()

    this.removeAllListeners()

    this.cleanupWebSocket()
  }
}
