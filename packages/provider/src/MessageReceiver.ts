import * as awarenessProtocol from 'y-protocols/awareness'
import { readSyncMessage, messageYjsSyncStep2 } from 'y-protocols/sync'
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
    const type = this.message.readVarUint()

    switch (type) {
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
        throw new Error(`Can’t apply message of unknown type: ${type}`)
    }
  }

  private applySyncMessage(provider: HocuspocusProvider, emitSynced: boolean) {
    const { message } = this

    message.writeVarUint(MessageType.Sync)

    try {
      const syncMessageType = readSyncMessage(
        message.decoder,
        message.encoder,
        provider.document,
        provider,
      )

      if (emitSynced && syncMessageType === messageYjsSyncStep2) {
        provider.synced = true
      }
    } catch (e) {
      // TODO: That shouldn’t happen … but it does. Remove the try/catch and run the tests.
    }
  }

  private applyAwarenessMessage(provider: HocuspocusProvider) {
    const { message } = this

    awarenessProtocol.applyAwarenessUpdate(
      provider.awareness,
      message.readVarUint8Array(),
      provider,
    )
  }

  private applyAuthMessage(provider: HocuspocusProvider) {
    const { message } = this

    readAuthMessage(
      message.decoder,
      provider.permissionDeniedHandler.bind(provider),
      provider.authenticatedHandler.bind(provider),
    )
  }

  private applyQueryAwarenessMessage(provider: HocuspocusProvider) {
    const { message } = this

    message.writeVarUint(MessageType.Awareness)
    message.writeVarUint8Array(
      awarenessProtocol.encodeAwarenessUpdate(
        provider.awareness,
        Array.from(provider.awareness.getStates().keys()),
      ),
    )
  }
}
