'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Avatar, Box, Button, Container, Divider, ListItemIcon, Menu, MenuItem, Stack, Typography } from '@mui/material'
import { Logout, Verified } from '@mui/icons-material'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { logout } from '@/store/slices/authSlice'
import { tokens as t } from '@/theme/tokens'
import { Logo } from './ui'

const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

export default function AppShell({ children }: { children: React.ReactNode }) {
  const user = useAppSelector((s) => s.auth.user)
  const dispatch = useAppDispatch()
  const router = useRouter()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const signOut = async () => {
    setAnchor(null)
    await dispatch(logout())
    router.push('/')
  }

  const home = user?.role === 'hospital' ? '/hospital/dashboard' : user?.role === 'admin' ? '/admin' : '/donor/dashboard'

  return (
    <Box minHeight="100vh">
      <Box
        component="header"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1100,
          bgcolor: 'rgba(243,236,224,0.82)',
          backdropFilter: 'saturate(140%) blur(12px)',
          borderBottom: `1px solid ${scrolled ? t.line : 'transparent'}`,
          transition: 'border-color 200ms ease',
        }}
      >
        <Container maxWidth="lg">
          <Stack direction="row" alignItems="center" justifyContent="space-between" height={64}>
            <Link href={home} style={{ color: 'inherit', textDecoration: 'none' }} aria-label="DonorConnect home">
              <Logo />
            </Link>
            {user && (
              <>
                <Button
                  onClick={(e) => setAnchor(e.currentTarget)}
                  variant="text"
                  sx={{ pl: 0.75, pr: 1.5, gap: 1, color: t.ink }}
                  aria-haspopup="menu"
                >
                  <Avatar sx={{ width: 30, height: 30, fontSize: 12, fontWeight: 700, bgcolor: t.ink, color: t.surface }}>
                    {initials(user.hospitalName || user.name)}
                  </Avatar>
                  <Box textAlign="left" display={{ xs: 'none', sm: 'block' }}>
                    <Typography variant="body2" fontWeight={600} lineHeight={1.2}>
                      {user.hospitalName || user.name}
                    </Typography>
                    <Typography variant="caption" lineHeight={1.2} textTransform="capitalize">
                      {user.role}
                      {user.bloodGroup ? ` · ${user.bloodGroup}` : ''}
                    </Typography>
                  </Box>
                </Button>
                <Menu
                  anchorEl={anchor}
                  open={!!anchor}
                  onClose={() => setAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  slotProps={{ paper: { sx: { minWidth: 220, mt: 0.5 } } }}
                >
                  <Box px={2} py={1.25}>
                    <Typography variant="body2" fontWeight={600}>
                      {user.name}
                    </Typography>
                    <Typography variant="caption">{user.email}</Typography>
                    {user.role === 'hospital' && (
                      <Stack direction="row" alignItems="center" spacing={0.5} mt={0.75} color={user.isVerified ? t.success : t.warning}>
                        <Verified sx={{ fontSize: 14 }} />
                        <Typography variant="caption" color="inherit" fontWeight={600}>
                          {user.isVerified ? 'Verified hospital' : 'Verification pending'}
                        </Typography>
                      </Stack>
                    )}
                  </Box>
                  <Divider />
                  <MenuItem onClick={signOut} sx={{ py: 1.25 }}>
                    <ListItemIcon>
                      <Logout fontSize="small" />
                    </ListItemIcon>
                    Sign out
                  </MenuItem>
                </Menu>
              </>
            )}
          </Stack>
        </Container>
      </Box>
      <Container maxWidth="lg" sx={{ pb: 10 }}>
        {children}
      </Container>
    </Box>
  )
}

