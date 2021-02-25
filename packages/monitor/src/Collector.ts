import osu from 'node-os-utils'
import process from 'process'
import moment from 'moment'
import {
  defaultConfiguration,
  Configuration,
  onConnectPayload,
  onDisconnectPayload,
} from '@hocuspocus/server'

export class Collector {

  serverConfiguration: Partial<Configuration> = defaultConfiguration

  async memory() {
    const memory = await osu.mem.info()

    return {
      free: memory.freeMemMb,
      total: memory.totalMemMb,
      usage: 100 - memory.freeMemPercentage,
    }
  }

  async cpu() {
    return {
      count: osu.cpu.count(),
      model: osu.cpu.model(),
      usage: await osu.cpu.usage(),
    }
  }

  connect(data: onConnectPayload) {
    const { documentName } = data

    return {
      action: 'connected',
      documentName,
    }
  }

  disconnect(data: onDisconnectPayload) {
    const { documentName } = data

    return {
      action: 'disconnected',
      documentName,
    }
  }

  info() {
    return {
      version: process.version,
      platform: process.platform,
      started: moment().subtract(process.uptime(), 'second').toISOString(),
      configuration: this.serverConfiguration,
    }
  }

}
