import {
  createEncoder,
  Encoder,
  toUint8Array,
  writeVarUint,
  writeVarUint8Array,
} from 'lib0/encoding'
import { writeSyncStep1, writeUpdate } from 'y-protocols/sync'
import { Awareness, encodeAwarenessUpdate } from 'y-protocols/awareness'

import { writeAuthenticated, writePermissionDenied } from '@hocuspocus/common'
import { MessageType } from './types'
import Document from './Document'

export class OutgoingMessage {

  encoder: Encoder

  type?: number

  category?: string

  constructor() {
    this.encoder = createEncoder()
  }

  createSyncMessage(): OutgoingMessage {
    this.type = MessageType.Sync

    writeVarUint(this.encoder, MessageType.Sync)

    return this
  }

  createAwarenessUpdateMessage(awareness: Awareness, changedClients?: Array<any>): OutgoingMessage {
    this.type = MessageType.Awareness
    this.category = 'Update'

    const message = encodeAwarenessUpdate(
      awareness,
      changedClients || Array.from(awareness.getStates().keys()),
    )

    writeVarUint(this.encoder, MessageType.Awareness)
    writeVarUint8Array(this.encoder, message)

    return this
  }

  writeAuthenticated(): OutgoingMessage {
    this.type = MessageType.Auth
    this.category = 'Authenticated'

    writeVarUint(this.encoder, MessageType.Auth)
    writeAuthenticated(this.encoder)

    return this
  }

  writePermissionDenied(reason: string): OutgoingMessage {
    this.type = MessageType.Auth
    this.category = 'PermissionDenied'

    writeVarUint(this.encoder, MessageType.Auth)
    writePermissionDenied(this.encoder, reason)

    return this
  }

  writeFirstSyncStepFor(document: Document): OutgoingMessage {
    this.category = 'SyncStep1'

    writeSyncStep1(this.encoder, document)

    return this
  }

  writeUpdate(update: Uint8Array): OutgoingMessage {
    this.category = 'Update'

    writeUpdate(this.encoder, update)

    return this
  }

  toUint8Array(): Uint8Array {
    return toUint8Array(this.encoder)
  }
}
