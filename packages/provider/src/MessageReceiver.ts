import * as awarenessProtocol from 'y-protocols/awareness'
import { readSyncMessage, messageYjsSyncStep2, messageYjsUpdate } from 'y-protocols/sync'
import { readAuthMessage } from '@hocuspocus/common'
import { readVarString } from 'lib0/decoding'
import { MessageType } from './types.js'
import { HocuspocusProvider } from './HocuspocusProvider.js'
import { IncomingMessage } from './IncomingMessage.js'
import { OutgoingMessage } from './OutgoingMessage.js'

export class MessageReceiver {

  message: IncomingMessage

  broadcasted = false

  constructor(message: IncomingMessage) {
    this.message = message
  }

  public setBroadcasted(value: boolean) {
    this.broadcasted = value

    return this
  }

  public apply(provider: HocuspocusProvider, emitSynced = true) {
    const { message } = this
    const type = message.readVarUint()

    const emptyMessageLength = message.length()

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

      case MessageType.Stateless:
        provider.receiveStateless(readVarString(message.decoder))
        break

      case MessageType.SyncStatus:
        // nothing for now; forward-compatability
        break

      default:
        throw new Error(`Can’t apply message of unknown type: ${type}`)
    }

    // Reply
    if (message.length() > emptyMessageLength + 1) { // length of documentName (considered in emptyMessageLength plus length of yjs sync type, set in applySyncMessage)
      if (this.broadcasted) {
        // TODO: Some weird TypeScript error
        // @ts-ignore
        provider.broadcast(OutgoingMessage, { encoder: message.encoder })
      } else {
        // TODO: Some weird TypeScript error
        // @ts-ignore
        provider.send(OutgoingMessage, { encoder: message.encoder })
      }
    }
  }

  private applySyncMessage(provider: HocuspocusProvider, emitSynced: boolean) {
    const { message } = this

    message.writeVarUint(MessageType.Sync)

    // Apply update
    const syncMessageType = readSyncMessage(
      message.decoder,
      message.encoder,
      provider.document,
      provider,
    )

    // Synced once we receive Step2
    if (emitSynced && syncMessageType === messageYjsSyncStep2) {
      provider.synced = true
    }

    if (syncMessageType === messageYjsUpdate || syncMessageType === messageYjsSyncStep2) {
      if (provider.unsyncedChanges > 0) {
        provider.updateUnsyncedChanges(-1)
      }
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
