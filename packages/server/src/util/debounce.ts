export const useDebounce = () => {
  const timers: Map<string, {
    timeout: NodeJS.Timeout,
    start: number
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
      func()
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
    })
  }

  return debounce
}
