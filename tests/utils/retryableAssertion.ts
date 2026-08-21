import { sleep } from './sleep.ts'

export const retryableAssertion = async (fn: () => void | Promise<void>) => {
  while (true) {
    try {
      await fn()
      break
    } catch {
      await sleep(100)
    }
  }
}
