export const useDebounce = () => {
  const timers: Map<string, {
    timeout: NodeJS.Timeout,
    start: number,
    func: Function
  }> = new Map()

  const debounce = (
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

    timers.set(id, {
      start,
      timeout: setTimeout(run, debounce),
      func: run,
    })
  }

  const executeNow = (id: string) => {
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
