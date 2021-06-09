import * as Y from 'yjs'
import * as encoding from 'lib0/encoding'
import * as syncProtocol from 'y-protocols/sync'
import { MessageType } from '../types'
import { OutgoingMessage } from '../OutgoingMessage'

export class SyncStepTwoMessage extends OutgoingMessage {
  get(document: Y.Doc) {
    encoding.writeVarUint(this.encoder, MessageType.Sync)
    syncProtocol.writeSyncStep2(this.encoder, document)
    return encoding.toUint8Array(this.encoder)
  }
}
