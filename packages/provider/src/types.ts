import { Encoder } from 'lib0/encoding'
import type { CloseEvent, Event, MessageEvent } from 'ws'
import { Awareness } from 'y-protocols/awareness'
import * as Y from 'yjs'
import { IncomingMessage } from './IncomingMessage.js'
import { OutgoingMessage } from './OutgoingMessage.js'
import { AuthenticationMessage } from './OutgoingMessages/AuthenticationMessage.js'
import { AwarenessMessage } from './OutgoingMessages/AwarenessMessage.js'
import { QueryAwarenessMessage } from './OutgoingMessages/QueryAwarenessMessage.js'
import { SyncStepOneMessage } from './OutgoingMessages/SyncStepOneMessage.js'
import { SyncStepTwoMessage } from './OutgoingMessages/SyncStepTwoMessage.js'
import { UpdateMessage } from './OutgoingMessages/UpdateMessage.js'

export enum MessageType {
  Sync = 0,
  Awareness = 1,
  Auth = 2,
  QueryAwareness = 3,
  Stateless = 5,
  CLOSE = 7,
  SyncStatus = 8,
}

export enum WebSocketStatus {
  Connecting = 'connecting',
  Connected = 'connected',
  Disconnected = 'disconnected',
}

export interface OutgoingMessageInterface {
  encoder: Encoder
  type?: MessageType
}

export interface OutgoingMessageArguments {
  documentName: string,
  token: string,
  document: Y.Doc,
  awareness: Awareness,
  clients: number[],
  states: Map<number, { [key: string]: any; }>,
  update: any,
  payload: string,
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

export type onAuthenticationFailedParameters = {
  reason: string,
}

export type onOpenParameters = {
  event: Event,
}

export type onMessageParameters = {
  event: MessageEvent,
  message: IncomingMessage,
}

export type onOutgoingMessageParameters = {
  message: OutgoingMessage,
}

export type onStatusParameters = {
  status: WebSocketStatus,
}

export type onSyncedParameters = {
  state: boolean,
}

export type onDisconnectParameters = {
  event: CloseEvent,
}

export type onCloseParameters = {
  event: CloseEvent,
}

export type onAwarenessUpdateParameters = {
  states: StatesArray
}

export type onAwarenessChangeParameters = {
  states: StatesArray
}

export type onStatelessParameters = {
  payload: string
}

export type StatesArray = { clientId: number, [key: string | number]: any }[]
