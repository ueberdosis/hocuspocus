import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'

enum AuthMessageType {
  Token = 0,
  PermissionDenied = 1,
  Authenticated = 2,
}

export const writeAuthentication = (encoder: encoding.Encoder, auth: string) => {
  encoding.writeVarUint(encoder, AuthMessageType.Token)
  encoding.writeVarString(encoder, auth)
}

export const writePermissionDenied = (encoder: encoding.Encoder, reason: string) => {
  encoding.writeVarUint(encoder, AuthMessageType.PermissionDenied)
  encoding.writeVarString(encoder, reason)
}

export const writeAuthenticated = (encoder: encoding.Encoder, scope: 'readonly' | 'read-write') => {
  encoding.writeVarUint(encoder, AuthMessageType.Authenticated)
  encoding.writeVarString(encoder, scope)
}

export const readAuthMessage = (
  decoder: decoding.Decoder,
  permissionDeniedHandler: (reason: string) => void,
  authenticatedHandler: (scope: string) => void,
) => {
  switch (decoding.readVarUint(decoder)) {
    case AuthMessageType.PermissionDenied: {
      permissionDeniedHandler(decoding.readVarString(decoder))
      break
    }
    case AuthMessageType.Authenticated: {
      authenticatedHandler(decoding.readVarString(decoder))
      break
    }
    default:
  }
}
