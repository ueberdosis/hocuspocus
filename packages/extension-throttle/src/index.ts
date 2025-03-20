import type {
  Extension,
  onConnectPayload,
} from '@hocuspocus/server'

export interface ThrottleConfiguration {
  throttle: number | null | false, // how many requests within `consideredSeconds` until we're rejecting requests (setting this to 15 means the 16th request will be rejected)
  consideredSeconds: number, // how many seconds to consider (default is last 60 seconds from the current connection attempt)
  banTime: number, // for how long to ban after receiving too many requests (in minutes!)
  cleanupInterval: number // how often to clean up the records of IPs (this won't delete ips that are still blocked or recent enough by `consideredSeconds`)
}

export class Throttle implements Extension {

  configuration: ThrottleConfiguration = {
    throttle: 15,
    banTime: 5,
    consideredSeconds: 60,
    cleanupInterval: 90,
  }

  connectionsByIp: Map<string, Array<number>> = new Map()

  bannedIps: Map<string, number> = new Map()

  cleanupInterval?: NodeJS.Timeout

  /**
   * Constructor
   */
  constructor(configuration?: Partial<ThrottleConfiguration>) {
    this.configuration = {
      ...this.configuration,
      ...configuration,
    }

    this.cleanupInterval = setInterval(this.clearMaps.bind(this), this.configuration.cleanupInterval * 1000)
  }

  onDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    return Promise.resolve()
  }

  public clearMaps() {
    this.connectionsByIp.forEach((value, key) => {
      const filteredValue = value
        .filter(timestamp => timestamp + (this.configuration.consideredSeconds * 1000) > Date.now())

      if (filteredValue.length) {
        this.connectionsByIp.set(key, filteredValue)
      } else {
        this.connectionsByIp.delete(key)
      }
    })

    this.bannedIps.forEach((value, key) => {
      if (!this.isBanned(key)) {
        this.bannedIps.delete(key)
      }
    })
  }

  isBanned(ip: string) {
    const bannedAt = this.bannedIps.get(ip) || 0
    return Date.now() < (bannedAt + (this.configuration.banTime * 60 * 1000))
  }

  /**
   * Throttle requests
   * @private
   */
  private throttle(ip: string): boolean {
    if (!this.configuration.throttle) {
      return false
    }

    if (this.isBanned(ip)) return true

    this.bannedIps.delete(ip)

    // add this connection try to the list of previous connections
    const previousConnections = this.connectionsByIp.get(ip) || []
    previousConnections.push(Date.now())

    // calculate the previous connections in the last considered time interval
    const previousConnectionsInTheConsideredInterval = previousConnections
      .filter(timestamp => timestamp + (this.configuration.consideredSeconds * 1000) > Date.now())

    this.connectionsByIp.set(ip, previousConnectionsInTheConsideredInterval)

    if (previousConnectionsInTheConsideredInterval.length > this.configuration.throttle) {
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
