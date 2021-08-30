import { CloseEvent } from './types'

export const Forbidden: CloseEvent = {
  code: 4403,
  reason: 'Forbidden',
}

export const ResetConnection: CloseEvent = {
  code: 4205,
  reason: 'Reset Connection',
}

export const CloseEvents: CloseEvent[] = [
  Forbidden,
  ResetConnection,
]
