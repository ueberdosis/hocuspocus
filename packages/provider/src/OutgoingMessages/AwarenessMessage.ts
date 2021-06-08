import * as encoding from 'lib0/encoding'
import { Awareness, encodeAwarenessUpdate } from 'y-protocols/awareness'
import { MessageTypes } from '../types'
import { OutgoingMessage } from '../OutgoingMessage'

export class AwarenessMessage extends OutgoingMessage {
  get(
    awareness: Awareness,
    clients: number[],
    states: Map<number, { [x: string]: any; }> | undefined = undefined,
  ) {
    encoding.writeVarUint(this.encoder, MessageTypes.Awareness)

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
