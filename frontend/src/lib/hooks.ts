'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** Fetch on mount, expose refresh + optimistic set. Keeps stale data while refreshing. */
export function useResource<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const fetchRef = useRef(fetcher)
  fetchRef.current = fetcher

  const refresh = useCallback(async () => {
    try {
      const value = await fetchRef.current()
      setData(value)
      setError(null)
      return value
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, setData, error, loading, refresh }
}

/** Re-render every `ms` — for countdowns and relative times. */
export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}
