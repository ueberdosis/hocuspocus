import {
  Extension,
  onChangePayload,
  onConfigurePayload,
  onConnectPayload,
  onLoadDocumentPayload,
  onDestroyPayload,
  onDisconnectPayload,
  onRequestPayload,
  onUpgradePayload,
  Debugger,
  MessageType,
} from '@hocuspocus/server'

export interface LoggerConfiguration {
  /**
   * Prepend all logging message with a string.
   *
   * @deprecated
   */
  prefix: null | string,
  /**
   * Whether to log something for the `onLoadDocument` hook.
   */
  onLoadDocument: boolean,
  /**
   * Whether to log something for the `onChange` hook.
   */
  onChange: boolean,
  /**
   * Whether to log something for the `onStoreDocument` hook.
   */
   onStoreDocument: boolean,
  /**
   * Whether to log something for the `onConnect` hook.
   */
  onConnect: boolean,
  /**
   * Whether to log something for the `onDisconnect` hook.
   */
  onDisconnect: boolean,
  /**
   * Whether to log something for the `onUpgrade` hook.
   */
  onUpgrade: boolean,
  /**
   * Whether to log something for the `onRequest` hook.
   */
  onRequest: boolean,
  /**
   * Whether to log something for the `onDestroy` hook.
   */
  onDestroy: boolean,
  /**
   * Whether to log something for the `onConfigure` hook.
   */
  onConfigure: boolean,
  /**
   * A log function, if none is provided output will go to console
   */
  log: (...args: any[]) => void,
  /**
   * A info function, if none is provided output will go to console
   */
  info: (...args: any[]) => void,
  /**
   * A warn function, if none is provided output will go to console
   */
  warn: (...args: any[]) => void,
  /**
   * A error function, if none is provided output will go to console
   */
  error: (...args: any[]) => void,
  /**
   * A debug function, if none is provided output will go to console
   */
  debug: (...args: any[]) => void,
}

export class Logger extends Debugger implements Extension {
  name: string | null = null

  configuration: LoggerConfiguration = {
    prefix: null,
    onLoadDocument: true,
    onChange: true,
    onStoreDocument: true,
    onConnect: true,
    onDisconnect: true,
    onUpgrade: true,
    onRequest: true,
    onDestroy: true,
    onConfigure: true,
    log: console.log,     // eslint-disable-line
    info: console.info,   // eslint-disable-line
    warn: console.warn,   // eslint-disable-line
    error: console.error, // eslint-disable-line
    debug: console.debug, // eslint-disable-line
  }

  /**
   * Constructor
   */
  constructor(configuration?: Partial<LoggerConfiguration>) {
    super();
    this.configuration = {
      ...this.configuration,
      ...configuration,
    }
  }

  async onConfigure(data: onConfigurePayload) {
    this.name = data.instance.configuration.name
    data.instance.debugger = this;

    if (!this.configuration.onConfigure) {
      return
    }

    if (this.configuration.prefix) {
      console.warn('[hocuspocus warn] The Logger \'prefix\' is deprecated. Pass a \'name\' to the Hocuspocus configuration instead.')
    }
  }

  async onLoadDocument(data: onLoadDocumentPayload) {
    if (this.configuration.onLoadDocument) {
      this.info(`Loaded document "${data.documentName}".`)
    }
  }

  async onChange(data: onChangePayload) {
    if (this.configuration.onChange) {
      this.info(`Document "${data.documentName}" changed.`)
    }
  }

  async onStoreDocument(data: onDisconnectPayload) {
    if (this.configuration.onStoreDocument) {
      this.info(`Store "${data.documentName}".`)
    }
  }

  async onConnect(data: onConnectPayload) {
    if (this.configuration.onConnect) {
      this.info(`New connection to "${data.documentName}".`)
    }
  }

  async onDisconnect(data: onDisconnectPayload) {
    if (this.configuration.onDisconnect) {
      this.info(`Connection to "${data.documentName}" closed.`)
    }
  }

  async onUpgrade(data: onUpgradePayload) {
    if (this.configuration.onUpgrade) {
      this.info('Upgrading connection …')
    }
  }

  async onRequest(data: onRequestPayload) {
    if (this.configuration.onRequest) {
      this.info(`Incoming HTTP Request to ${data.request.url}`)
    }
  }

  async onDestroy(data: onDestroyPayload) {
    if (this.configuration.onDestroy) {
      this.info('Shut down.')
    }
  }

  info(...args: any) {
    this.configuration.info(...args);
  }

  warn(...args: any) {
    this.configuration.warn(...args);
  }

  error(...args: any) {
    this.configuration.error(...args);
  }

  debug(...args: any) {
    this.configuration.debug(...args);
  }

  /**
   * Allows compatability with Debugger so Logger instance
   * can be used as hocuspocus instance debugger. This
   * means other extensions can re-use this logger, by
   * referencing this.instance.debugger
   */
  log(message: any) {
    if (!this.listen) {
      return this
    }

    const item = {
      ...message,
      type: MessageType[message.type],
      // time: time.getUnixTime(),
    }

    this.logs.push(item)

    if (this.output) {
      const date = (new Date()).toISOString();
      let meta = `${date}`;

      if (this.name) {
        meta = `${this.name} ${meta}`;
      }
      this.configuration.log(meta, item.direction === 'in' ? 'IN –>' : 'OUT <–', `${item.type}/${item.category}`);
    }

    return this
  }
}
