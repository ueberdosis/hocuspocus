import * as decoding from 'lib0/decoding'
import * as encoding from 'lib0/encoding'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as syncProtocol from 'y-protocols/sync'
import { MessageType } from './types'
import { HocuspocusProvider } from './HocuspocusProvider'
import { IncomingMessage } from './IncomingMessage'
import { readAuthMessage } from '../../../shared/protocols/auth'

export class MessageReceiver {

  message: IncomingMessage

  constructor(message: IncomingMessage) {
    this.message = message
  }

  public apply(provider: HocuspocusProvider, emitSynced = true) {
    switch (this.message.type) {
      case MessageType.Sync:
        this.applySyncMessage(provider, emitSynced)
        break

      case MessageType.Awareness:
        this.applyAwarenessMessage(provider)
        break

      case MessageType.Auth:
        this.applyAuthMessage(provider)
        break

      case MessageType.QueryAwareness:
        this.applyQueryAwarenessMessage(provider)
        break

      default:
        throw new Error(`Can’t apply unknown type of message: ${this.message.type}`)
    }

    return this.message.encoder
  }

  private applySyncMessage(provider: HocuspocusProvider, emitSynced: boolean) {
    encoding.writeVarUint(this.message.encoder, MessageType.Sync)

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

  private applyAwarenessMessage(provider: HocuspocusProvider) {
    awarenessProtocol.applyAwarenessUpdate(
      provider.awareness,
      decoding.readVarUint8Array(this.message.decoder),
      provider,
    )
  }

  private applyAuthMessage(provider: HocuspocusProvider) {
    readAuthMessage(
      this.message.decoder,
      provider.permissionDeniedHandler.bind(provider),
      provider.authenticatedHandler.bind(provider),
    )
  }

  private applyQueryAwarenessMessage(provider: HocuspocusProvider) {
    encoding.writeVarUint(this.message.encoder, MessageType.Awareness)
    encoding.writeVarUint8Array(
      this.message.encoder,
      awarenessProtocol.encodeAwarenessUpdate(
        provider.awareness,
        Array.from(provider.awareness.getStates().keys()),
      ),
    )
  }
}
