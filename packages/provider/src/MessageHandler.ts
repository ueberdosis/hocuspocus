import * as decoding from 'lib0/decoding'
import * as encoding from 'lib0/encoding'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as syncProtocol from 'y-protocols/sync'
import * as authProtocol from 'y-protocols/auth'
import { MessageTypes } from './types'
import { HocuspocusProvider } from './HocuspocusProvider'
import { IncomingMessage } from './IncomingMessage'

export class MessageHandler {

  message: IncomingMessage

  constructor(message: IncomingMessage) {
    this.message = message
  }

  public handle(provider: HocuspocusProvider, emitSynced: boolean) {
    switch (this.message.type) {
      case MessageTypes.Sync:
        this.handleSyncMessage(provider, emitSynced)
        break

      case MessageTypes.Awareness:
        this.handleAwarenessMessage(provider)
        break

      case MessageTypes.Auth:
        this.handleAuthMessage(provider)
        break

      case MessageTypes.QueryAwareness:
        this.handleQueryAwarenessMessage(provider)
        break

      default:
        throw new Error('Unknown message type')
    }

    return this.message.encoder
  }

  private handleSyncMessage(provider: HocuspocusProvider, emitSynced: boolean) {
    encoding.writeVarUint(this.message.encoder, MessageTypes.Sync)

    const syncMessageType = syncProtocol.readSyncMessage(
      this.message.decoder,
      this.message.encoder,
      provider.document,
      provider,
    )

    if (emitSynced && syncMessageType === syncProtocol.messageYjsSyncStep2) {
      provider.synced = true
    }
  }

  private handleAwarenessMessage(provider: HocuspocusProvider) {
    awarenessProtocol.applyAwarenessUpdate(
      provider.awareness,
      decoding.readVarUint8Array(this.message.decoder),
      provider,
    )
  }

  private handleAuthMessage(provider: HocuspocusProvider) {
    authProtocol.readAuthMessage(
      this.message.decoder,
      provider.document,
      // TODO: Add a configureable hook
      (provider, reason) => {
        console.warn(`Permission denied to access ${provider.url}.\n${reason}`)
      },
    )
  }

  private handleQueryAwarenessMessage(provider: HocuspocusProvider) {
    encoding.writeVarUint(this.message.encoder, MessageTypes.Awareness)
    encoding.writeVarUint8Array(
      this.message.encoder,
      awarenessProtocol.encodeAwarenessUpdate(
        provider.awareness,
        Array.from(provider.awareness.getStates().keys()),
      ),
    )
  }
}
