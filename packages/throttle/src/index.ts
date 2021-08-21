import {
  Extension,
  onConnectPayload,
} from '@hocuspocus/server'

export interface Configuration {
  throttle: number | null | false,
  banTime: number,
}

export class Throttle implements Extension {

  configuration: Configuration = {
    throttle: 15,
    banTime: 5,
  }

  connectionsByIp: Map<string, Array<number>> = new Map()

  bannedIps: Map<string, number> = new Map()

  /**
   * Throttle requests
   * @private
   */
  private throttle(ip: string): Boolean {
    if (!this.configuration.throttle) {
      return false
    }

    const bannedAt = this.bannedIps.get(ip) || 0

    if (Date.now() < (bannedAt + (this.configuration.banTime * 60 * 1000))) {
      return true
    }

    this.bannedIps.delete(ip)

    // add this connection try to the list of previous connections
    const previousConnections = this.connectionsByIp.get(ip) || []
    previousConnections.push(Date.now())

    // calculate the previous connections in the last minute
    const previousConnectionsInTheLastMinute = previousConnections
      .filter(timestamp => timestamp + (60 * 1000) > Date.now())

    this.connectionsByIp.set(ip, previousConnectionsInTheLastMinute)

    if (previousConnectionsInTheLastMinute.length > this.configuration.throttle) {
      this.bannedIps.set(ip, Date.now())
      return true
    }

    return false
  }

  /**
   * onConnect hook
   * @param data
   */
  onConnect(data: onConnectPayload): Promise<any> {
    const { request } = data

    // get the remote ip address
    const ip = request.headers['x-real-ip']
      || request.headers['x-forwarded-for']
      || request.socket.remoteAddress
      || ''

    // throttle the connection
    return this.throttle(<string> ip) ? Promise.reject() : Promise.resolve()
  }

}
