import { Awareness } from 'y-protocols/awareness'
import * as Y from 'yjs'
import { Encoder } from 'lib0/encoding'
import { AuthenticationMessage } from './OutgoingMessages/AuthenticationMessage'
import { AwarenessMessage } from './OutgoingMessages/AwarenessMessage'
import { QueryAwarenessMessage } from './OutgoingMessages/QueryAwarenessMessage'
import { SyncStepOneMessage } from './OutgoingMessages/SyncStepOneMessage'
import { SyncStepTwoMessage } from './OutgoingMessages/SyncStepTwoMessage'
import { UpdateMessage } from './OutgoingMessages/UpdateMessage'

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

export type ConstructableOutgoingMessage =
  Constructable<AuthenticationMessage> |
  Constructable<AwarenessMessage> |
  Constructable<QueryAwarenessMessage> |
  Constructable<SyncStepOneMessage> |
  Constructable<SyncStepTwoMessage> |
  Constructable<UpdateMessage>

export type onAwarenessUpdateParameters = {
  states: StatesArray
}

export type onAwarenessChangeParameters = {
  states: StatesArray
}

export type StatesArray = { clientId: number, [key: string | number]: any }[]
