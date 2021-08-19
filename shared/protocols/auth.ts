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

export const writeAuthenticated = (encoder: encoding.Encoder) => {
  encoding.writeVarUint(encoder, AuthMessageType.Authenticated)
}

export const readAuthMessage = (
  decoder: decoding.Decoder,
  permissionDeniedHandler: (reason: string) => void,
  authenticatedHandler: () => void,
) => {
  switch (decoding.readVarUint(decoder)) {
    case AuthMessageType.PermissionDenied: {
      permissionDeniedHandler(decoding.readVarString(decoder))
      break
    }
    case AuthMessageType.Authenticated: {
      authenticatedHandler()
      break
    }
    default:
  }
}
