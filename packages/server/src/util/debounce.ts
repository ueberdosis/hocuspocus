export const useDebounce = () => {
  const timers: Map<string, {
    timeout: NodeJS.Timeout,
    promise: Promise<void>,
    resolve: () => void,
    start: number
  }> = new Map()

  const debounce = (
    id: string,
    func: Function,
    debounce: number,
    maxDebounce: number,
  ) => {
    // default function to satisfy typescript
    let newResolve: () => void = () => {}
    const newPromise = new Promise<void>(resolve => {
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
    return newPromise
  }

  return debounce
}
