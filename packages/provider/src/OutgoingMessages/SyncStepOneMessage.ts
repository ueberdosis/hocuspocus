import * as Y from 'yjs'
import * as encoding from 'lib0/encoding'
import * as syncProtocol from 'y-protocols/sync'
import { MessageType } from '../types'
import { OutgoingMessage } from '../OutgoingMessage'

export class SyncStepOneMessage extends OutgoingMessage {
  type = MessageType.Sync

  description = 'First sync step'

  // document: Y.Doc
  get({ document }) {
    encoding.writeVarUint(this.encoder, this.type)
    syncProtocol.writeSyncStep1(this.encoder, document)
    return this.encoder
  }
}
