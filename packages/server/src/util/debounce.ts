export const useDebounce = () => {
  const timers: Map<string, {
    timeout: NodeJS.Timeout,
    promise: Promise<unknown>,
    resolve: (value: unknown) => void,
    start: number
  }> = new Map()

  /**
   * Debounce returns a promise that resolves when the function is eventually called.
   * All calls to the function within a given debounce window will recieve the same promise.
   */
  const debounce = (
    id: string,
    func: Function,
    debounce: number,
    maxDebounce: number,
  ) => {
    // default function to satisfy typescript
    let newResolve: (value: unknown) => void = () => {}
    const newPromise = new Promise<unknown>(resolve => {
      newResolve = resolve
    })
    const old = timers.get(id)
    const start = old?.start || Date.now()
    const promise = old?.promise || newPromise
    const resolve = old?.resolve || newResolve

    const run = async () => {
      timers.delete(id)
      const result = await func()
      resolve(result)
      return result
    }

    if (old?.timeout) {
      clearTimeout(old.timeout)
    }

    if (debounce === 0) {
      return run()
    }

    if (Date.now() - start >= maxDebounce) {
      return run()
    }

    timers.set(id, {
      start,
      timeout: setTimeout(run, debounce),
      promise,
      resolve,
    })
    return promise
  }

  return debounce
}
