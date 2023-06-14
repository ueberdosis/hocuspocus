import { IncomingMessage } from 'http'
import { URLSearchParams } from 'url'

/**
   * Get parameters by the given request
   */
export function getParameters(request?: Pick<IncomingMessage, 'url'>): URLSearchParams {
  const query = request?.url?.split('?') || []
  return new URLSearchParams(query[1] ? query[1] : '')
}
