import process from 'process'
import osu from 'node-os-utils'
import moment from 'moment'
import { publicIpv4 } from 'public-ip'
import {
  defaultConfiguration,
  Configuration,
  onConnectPayload,
  onDisconnectPayload,
  onLoadDocumentPayload,
  onChangePayload,
} from '@hocuspocus/server'
import collect from 'collect.js'
import {
  Doc,
} from 'yjs'

export class Collector {

  serverConfiguration: Partial<Configuration> = defaultConfiguration

  version = ''

  connections = {}

  messages = {}

  messageCounter = 0

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
    const { documentName, socketId } = data

    // @ts-ignore
    this.connections[documentName] = (this.connections[documentName] || 0) + 1

    return {
      action: 'connected',
      documentName,
      socketId,
    }
  }

  disconnect(data: onDisconnectPayload) {
    const { documentName, socketId } = data

    // @ts-ignore
    this.connections[documentName] = (this.connections[documentName] || 0) - 1

    return {
      action: 'disconnected',
      documentName,
      socketId,
    }
  }

  connectionCount() {
    return {
      count: collect(Object.values(this.connections)).sum(),
    }
  }

  createDocument(data: onLoadDocumentPayload) {
    const { documentName, document, socketId } = data

    return {
      action: 'created',
      document: Collector.readableYDoc(document),
      documentName,
      socketId,
    }
  }

  changeDocument(data: onChangePayload) {
    const { documentName, document, socketId } = data

    // @ts-ignore
    this.messages[documentName] = (this.messages[documentName] || 0) + 1
    this.messageCounter += 1

    return {
      action: 'changed',
      document: Collector.readableYDoc(document),
      documentName,
      socketId,
    }
  }

  messageCount() {
    const count = this.messageCounter
    this.messageCounter = 0

    return { count }
  }

  documentCount() {
    return {
      count: Object.keys(this.connections).length,
    }
  }

  documents() {
    const data = {}

    Object.keys(this.connections).forEach(documentName => {
      // @ts-ignore
      data[documentName] = {
        // @ts-ignore
        connections: this.connections[documentName] || 0,
        // @ts-ignore
        messages: this.messages[documentName] || 0,
      }
    })

    return data
  }

  async info() {
    return {
      configuration: this.serverConfiguration,
      ipAddress: await this.getIpAddress(),
      nodeVersion: process.version,
      platform: process.platform,
      started: moment().subtract(process.uptime(), 'second').toISOString(),
      version: this.version,
    }
  }

  private async getIpAddress() {
    try {
      return await publicIpv4()
    } catch {
      return null
    }
  }

  private static readableYDoc(doc: Doc): any {
    const data = {}

    doc.share?.forEach((item, key) => {
      // TODO: fix crapcode
      // @ts-ignore
      // eslint-disable-next-line no-underscore-dangle
      // const type = item._start?.content?.type?.constructor?.name
      //
      // const handlers = {
      //   YXmlElement() {
      //     return doc.getXmlFragment(key).toJSON()
      //   },
      // }
      //
      // // @ts-ignore
      // data[key] = handlers[type] ? handlers[type]() : null
    })

    return data
  }

}
