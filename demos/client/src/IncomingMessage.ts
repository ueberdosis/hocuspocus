// @ts-nocheck
import {
  createDecoder,
  Decoder,
} from 'lib0/decoding'

import * as decoding from 'lib0/decoding'
import * as encoding from 'lib0/encoding'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as syncProtocol from 'y-protocols/sync'
import * as authProtocol from 'y-protocols/auth'

import { MessageTypes } from './types'

/**
 * @param {HocuspocusClient} provider
 * @param {string} reason
 */
const permissionDeniedHandler = (provider, reason) => console.warn(`Permission denied to access ${provider.url}.\n${reason}`)

export class IncomingMessage {

  decoder: Decoder

  constructor(input: any) {
    if (!(input instanceof Uint8Array)) {
      input = new Uint8Array(input)
    }

    this.decoder = createDecoder(input)
    this.encoder = encoding.createEncoder()
  }

  public readMessage(provider, emitSynced) {
    const messageType = decoding.readVarUint(this.decoder)
    // const messageHandler = messageHandlers[messageType]

    // if (messageHandler) {
    //   messageHandler(encoder, this.decoder, foo, emitSynced, messageType)
    // } else {
    //   console.error('Unable to compute message')
    // }
    let syncMessageType

    switch (messageType) {
      case MessageTypes.Sync:
        encoding.writeVarUint(this.encoder, MessageTypes.Sync)
        syncMessageType = syncProtocol.readSyncMessage(
          this.decoder,
          this.encoder,
          provider.options.document,
          provider,
        )
        if (emitSynced && syncMessageType === syncProtocol.messageYjsSyncStep2 && !provider.synced) {
          provider.synced = true
        }
        break
      case MessageTypes.QueryAwareness:
        encoding.writeVarUint(this.encoder, MessageTypes.Awareness)
        encoding.writeVarUint8Array(this.encoder, awarenessProtocol.encodeAwarenessUpdate(provider.options.awareness, Array.from(provider.options.awareness.getStates().keys())))
        break
      case MessageTypes.Awareness:
        awarenessProtocol.applyAwarenessUpdate(provider.options.awareness, decoding.readVarUint8Array(this.decoder), provider)
        break
      case MessageTypes.Auth:
        authProtocol.readAuthMessage(this.decoder, provider.options.document, permissionDeniedHandler)
        break
      default:
        throw new Error('Unknown message type')
    }

    return this.encoder
  }
}

// import {
//   createDecoder,
//   Decoder,
//   readVarUint,
//   readVarUint8Array,
// } from 'lib0/decoding'
// import {
//   createEncoder,
//   Encoder,
//   length,
//   writeVarUint,
//   toUint8Array,
// } from 'lib0/encoding'
// import {
//   messageYjsSyncStep1,
//   messageYjsSyncStep2,
//   messageYjsUpdate,
//   readSyncStep1,
//   readSyncStep2,
//   readUpdate,
// } from 'y-protocols/sync'

// import Document from './Document'
// import { MessageTypes } from './types'
// import Connection from './Connection'

// export class IncomingMessage {

//   decoder: Decoder

//   syncMessageEncoder?: Encoder

//   constructor(input: any) {
//     if (!(input instanceof Uint8Array)) {
//       input = new Uint8Array(input)
//     }

//     this.decoder = createDecoder(input)
//   }

//   readSyncMessageAndApplyItTo(document: Document, connection?: Connection): void {
//     writeVarUint(this.encoder, MessageTypes.Sync)

//     const messageType = readVarUint(this.decoder)

//     // this is a copy of the original y-protocols/sync/readSyncMessage function
//     // which enables the read only mode
//     switch (messageType) {
//       case messageYjsSyncStep1:
//         readSyncStep1(this.decoder, this.encoder, document)
//         break
//       case messageYjsSyncStep2:
//         if (!connection?.readOnly) readSyncStep2(this.decoder, document, connection)
//         break
//       case messageYjsUpdate:
//         if (!connection?.readOnly) readUpdate(this.decoder, document, connection)
//         break
//       default:
//         throw new Error('Unknown message type')
//     }
//   }

//   readUint8Array(): Uint8Array {
//     return readVarUint8Array(this.decoder)
//   }

//   toUint8Array(): Uint8Array {
//     return toUint8Array(this.encoder)
//   }

//   get length(): number {
//     return length(this.encoder)
//   }

//   get messageType(): number {
//     return readVarUint(this.decoder)
//   }

//   private get encoder() {
//     if (!this.syncMessageEncoder) {
//       this.syncMessageEncoder = createEncoder()
//     }

//     return this.syncMessageEncoder
//   }
// }
