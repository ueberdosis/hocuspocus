import { Extension } from '@hocuspocus/server'
import { ExecutionContext } from 'ava'

export function createPromiseWithResolve(): [Promise<void>, () => void] {
  let resolve: () => void = () => {}
  const promise = new Promise<void>(r => {
    resolve = r
  })
  return [promise, resolve]
}

export function assertThrottledCallback(
  t: ExecutionContext,
  startTime: number,
  minTime: number,
  maxTime: number,
  resolve: () => void,
  callbackName: string,
  extensionName = 'default',
) {
  const endTime = Date.now()
  const totalTime = endTime - startTime
  if (startTime === 0) {
    t.fail('startTime not set')
  } else if (totalTime < minTime) {
    t.fail(
      `did not wait ${minTime}ms to call ${callbackName} (${totalTime}ms) (extension ${extensionName})`,
    )
  } else if (totalTime > maxTime) {
    t.fail(
      `waited longer than ${maxTime}ms to call ${callbackName} (${totalTime}ms) (extension ${extensionName})`,
    )
  } else {
    t.pass(extensionName)
  }
  resolve()
}

export function createStorageQueueExtension(
  extensionName: string,
  storageQueue: string,
  extension: Partial<Extension> = {},
) {
  return {
    extensionName,
    storageQueue,
    async onStoreDocument() {},
    ...extension,
  }
}
