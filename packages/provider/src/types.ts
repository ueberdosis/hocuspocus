import { Awareness } from 'y-protocols/awareness'
import * as Y from 'yjs'
import { Encoder } from 'lib0/encoding'

export enum MessageType {
  Sync = 0,
  Awareness = 1,
  Auth = 2,
  QueryAwareness = 3,
}

export interface OutgoingMessageInterface {
  encoder: Encoder
  type?: MessageType
}

export interface OutgoingMessageArguments {
  token: string,
  document: Y.Doc,
  awareness: Awareness,
  clients: number[],
  states: Map<number, { [key: string]: any; }>,
  update: any,
  encoder: Encoder,
}

export interface Constructable<T> {
  new(...args: any) : T
}
