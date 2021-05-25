import { CloseEvent } from './types'

export const Forbidden: CloseEvent = {
  code: 4403,
  reason: 'Forbidden',
}

export const CloseEvents: CloseEvent[] = [
  Forbidden,
]
