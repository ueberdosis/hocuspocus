import * as Y from 'yjs'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'

export const messageAuthentication = 7

export const messagePermissionDenied = 8

export const messageAuthenticated = 9

export const writeAuthentication = (encoder: encoding.Encoder, auth: string) => {
  encoding.writeVarUint(encoder, messageAuthentication)
  encoding.writeVarString(encoder, auth)
}

export const writePermissionDenied = (encoder: encoding.Encoder, reason: string) => {
  encoding.writeVarUint(encoder, messagePermissionDenied)
  encoding.writeVarString(encoder, reason)
}

export const writeAuthenticated = (encoder: encoding.Encoder) => {
  encoding.writeVarUint(encoder, messageAuthenticated)
}

export const readAuthMessage = (decoder: decoding.Decoder, document: Y.Doc, permissionDeniedHandler: any, authenticatedHandler: any) => {
  switch (decoding.readVarUint(decoder)) {
    case messagePermissionDenied: {
      permissionDeniedHandler(document, decoding.readVarString(decoder))
      break
    }
    case messageAuthenticated: {
      authenticatedHandler(document)
      break
    }
    default:
  }
}
