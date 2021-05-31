import * as decoding from 'lib0/decoding'
import * as encoding from 'lib0/encoding'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as syncProtocol from 'y-protocols/sync'
import * as authProtocol from 'y-protocols/auth'
import { MessageTypes } from './types'
import { HocuspocusProvider } from './HocuspocusProvider'

export class IncomingMessage {

  decoder: decoding.Decoder

  encoder: encoding.Encoder

  constructor(input: any) {
    this.decoder = decoding.createDecoder(input)
    this.encoder = encoding.createEncoder()
  }

  get messageType(): number {
    return decoding.readVarUint(this.decoder)
  }

  public handle(provider: HocuspocusProvider, emitSynced: boolean) {
    switch (this.messageType) {
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

    return this.encoder
  }

  private handleSyncMessage(provider: HocuspocusProvider, emitSynced: boolean) {
    encoding.writeVarUint(this.encoder, MessageTypes.Sync)

    const syncMessageType = syncProtocol.readSyncMessage(
      this.decoder,
      this.encoder,
      provider.options.document,
      provider,
    )

    if (emitSynced && syncMessageType === syncProtocol.messageYjsSyncStep2) {
      provider.synced = true
    }
  }

  private handleAwarenessMessage(provider: HocuspocusProvider) {
    awarenessProtocol.applyAwarenessUpdate(
      provider.options.awareness,
      decoding.readVarUint8Array(this.decoder),
      provider,
    )
  }

  private handleAuthMessage(provider: HocuspocusProvider) {
    authProtocol.readAuthMessage(
      this.decoder,
      provider.options.document,
      // TODO: Add a configureable hook
      (provider, reason) => {
        console.warn(`Permission denied to access ${provider.url}.\n${reason}`)
      },
    )
  }

  private handleQueryAwarenessMessage(provider: HocuspocusProvider) {
    encoding.writeVarUint(this.encoder, MessageTypes.Awareness)
    encoding.writeVarUint8Array(
      this.encoder,
      awarenessProtocol.encodeAwarenessUpdate(
        provider.options.awareness,
        Array.from(provider.options.awareness.getStates().keys()),
      ),
    )
  }
}
