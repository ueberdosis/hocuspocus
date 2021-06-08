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

  provider: HocuspocusProvider

  constructor(provider: HocuspocusProvider, message: IncomingMessage) {
    this.provider = provider
    this.message = message
  }

  public handle(emitSynced: boolean) {
    switch (this.message.type) {
      case MessageTypes.Sync:
        this.handleSyncMessage(emitSynced)
        break

      case MessageTypes.Awareness:
        this.handleAwarenessMessage()
        break

      case MessageTypes.Auth:
        this.handleAuthMessage()
        break

      case MessageTypes.QueryAwareness:
        this.handleQueryAwarenessMessage()
        break

      default:
        throw new Error(`Can’t handle unknown type of message: ${this.message.type}`)
    }

    return this.message.encoder
  }

  private handleSyncMessage(emitSynced: boolean) {
    encoding.writeVarUint(this.message.encoder, MessageTypes.Sync)

    const syncMessageType = syncProtocol.readSyncMessage(
      this.message.decoder,
      this.message.encoder,
      this.provider.document,
      this.provider,
    )

    if (emitSynced && syncMessageType === syncProtocol.messageYjsSyncStep2) {
      this.provider.synced = true
    }
  }

  private handleAwarenessMessage() {
    awarenessProtocol.applyAwarenessUpdate(
      this.provider.awareness,
      decoding.readVarUint8Array(this.message.decoder),
      this.provider,
    )
  }

  // TODO: This isn’t really used. Needs to be implemented in the server, or removed here.
  private handleAuthMessage() {
    authProtocol.readAuthMessage(
      this.message.decoder,
      this.provider.document,
      // TODO: Add a configureable hook
      (provider, reason) => {
        console.warn(`Permission denied to access ${provider.url}.\n${reason}`)
      },
    )
  }

  private handleQueryAwarenessMessage() {
    encoding.writeVarUint(this.message.encoder, MessageTypes.Awareness)
    encoding.writeVarUint8Array(
      this.message.encoder,
      awarenessProtocol.encodeAwarenessUpdate(
        this.provider.awareness,
        Array.from(this.provider.awareness.getStates().keys()),
      ),
    )
  }
}
