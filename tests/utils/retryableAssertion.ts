import { ExecutionContext } from 'ava'
import { sleep } from './sleep.js'

/* eslint-disable no-await-in-loop */
export const retryableAssertion = async (t: ExecutionContext, recoverableTry: (tt: ExecutionContext) => void) => {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const lastTry = await t.try(recoverableTry)

    if (lastTry.passed) {
      lastTry.commit()
      break
    }
    lastTry.discard()

    await sleep(100)
  }
}
