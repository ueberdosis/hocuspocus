import * as encoding from 'lib0/encoding'
import { Awareness, encodeAwarenessUpdate } from 'y-protocols/awareness'
import { MessageType } from '../types'
import { OutgoingMessage } from '../OutgoingMessage'

export class AwarenessMessage extends OutgoingMessage {
  type = MessageType.Awareness

  description = 'Awareness states update'

  // awareness: Awareness,
  //   clients: number[],
  //   states: Map<number, { [x: string]: any; }> | undefined = undefined,
  get({ awareness, clients, states }) {
    encoding.writeVarUint(this.encoder, this.type)

    let awarenessUpdate
    if (states === undefined) {
      awarenessUpdate = encodeAwarenessUpdate(awareness, clients)
    } else {
      awarenessUpdate = encodeAwarenessUpdate(awareness, clients, states)
    }

    encoding.writeVarUint8Array(this.encoder, awarenessUpdate)

    return encoding.toUint8Array(this.encoder)
  }
}
