// import * as time from 'lib0/time'
import { MessageType } from './types.js'

export class Debugger {
  logs: any[] = []

  listen = false

  output = false

  enable() {
    this.flush()

    this.listen = true
  }

  disable() {
    this.listen = false
  }

  verbose() {
    this.output = true
  }

  quiet() {
    this.output = false
  }

  info(...args: any) {
    if (this.output) {
      console.info(...args);
    }
  }

  warn(...args: any) {
    if (this.output) {
      console.warn(...args);
    }
  }

  error(...args: any) {
    if (this.output) {
      console.error(...args);
    }
  }

  debug(...args: any) {
    if (this.output) {
      console.debug(...args);
    }
  }

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
      console.log('[DEBUGGER]', item.direction === 'in' ? 'IN –>' : 'OUT <–', `${item.type}/${item.category}`)
    }

    return this
  }

  flush() {
    this.logs = []

    return this
  }

  get() {
    return {
      logs: this.logs,
    }
  }
}
