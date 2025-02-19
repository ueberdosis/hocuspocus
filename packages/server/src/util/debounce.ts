export const useDebounce = () => {
  const timers: Map<string, {
    timeout: NodeJS.Timeout,
    start: number,
    func: Function
  }> = new Map()

  const debounce = async (
    id: string,
    func: Function,
    debounce: number,
    maxDebounce: number,
  ) => {
    const old = timers.get(id)
    const start = old?.start || Date.now()

    const run = () => {
      timers.delete(id)
      return func()
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

    return new Promise((resolve, reject) => {
      const runResolveReject = () => run().then(resolve).catch(reject)

      timers.set(id, {
        start,
        timeout: setTimeout(runResolveReject, debounce),
        func: runResolveReject,
      })
    })
  }

  const executeNow = async (id: string) => {
    const old = timers.get(id)
    if (old) {
      clearTimeout(old.timeout)
      return old.func()
    }
  }

  const isDebounced = (id: string): boolean => {
    return timers.has(id)
  }

  return { debounce, isDebounced, executeNow }
}
