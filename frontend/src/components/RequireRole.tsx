'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Box, CircularProgress } from '@mui/material'
import { useAppSelector } from '@/store/hooks'
import type { User } from '@/lib/types'

/** Gate a page to one role. Waits for the session to be restored before deciding. */
export default function RequireRole({ role, children }: { role: User['role']; children: React.ReactNode }) {
  const { ready, isAuthenticated, user } = useAppSelector((s) => s.auth)
  const router = useRouter()
  const allowed = isAuthenticated && user?.role === role

  useEffect(() => {
    if (!ready) return
    if (!isAuthenticated) router.replace(`/auth/login?next=${encodeURIComponent(window.location.pathname)}`)
    else if (user && user.role !== role) router.replace(user.role === 'hospital' ? '/hospital/dashboard' : user.role === 'admin' ? '/admin' : '/donor/dashboard')
  }, [ready, isAuthenticated, user, role, router])

  if (!allowed) {
    return (
      <Box minHeight="60vh" display="grid" sx={{ placeItems: 'center' }}>
        <CircularProgress size={22} thickness={5} />
      </Box>
    )
  }
  return <>{children}</>
}
