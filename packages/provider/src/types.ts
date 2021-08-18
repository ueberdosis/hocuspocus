import { Awareness } from 'y-protocols/awareness'
import * as Y from 'yjs'
import * as encoding from 'lib0/encoding'

export enum MessageType {
  Sync = 0,
  Awareness = 1,
  Auth = 2,
  QueryAwareness = 3,
}

export interface OutgoingMessageInterface {
  encoder: encoding.Encoder
  type?: MessageType
}

export interface OutgoingMessageArguments {
  authentication: string,
  document: Y.Doc,
  awareness: Awareness,
  clients: number[],
  states: Map<number, { [key: string]: any; }>,
  update: any,
}

export interface Constructable<T> {
  new(...args: any) : T
}
