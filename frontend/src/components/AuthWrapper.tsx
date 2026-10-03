'use client'

import { useEffect } from 'react'
import { useAppDispatch } from '@/store/hooks'
import { refreshUser, restore } from '@/store/slices/authSlice'
import { tokenStore } from '@/lib/api'

/** Restores the session from localStorage after hydration, without blocking render. */
export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    try {
      const token = tokenStore.get()
      const user = localStorage.getItem('user')
      if (token && user) {
        dispatch(restore({ token, user: JSON.parse(user) }))
        dispatch(refreshUser())
        return
      }
    } catch {
      tokenStore.clear()
    }
    dispatch(restore(null))
  }, [dispatch])

  return <>{children}</>
}
