'use client'

import Link from 'next/link'
import { Box, Stack, Typography } from '@mui/material'
import { tokens as t } from '@/theme/tokens'
import { Logo } from './ui'

export default function AuthLayout({ children, aside }: { children: React.ReactNode; aside: React.ReactNode }) {
  return (
    <Box minHeight="100vh" display="grid" gridTemplateColumns={{ xs: '1fr', md: '5fr 6fr' }}>
      <Box
        className="grain"
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          bgcolor: t.ink,
          color: t.paper,
          p: 6,
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <svg width={22} height={22} viewBox="0 0 24 24" aria-hidden>
              <path d="M12 2.5c3.6 4.4 6.5 8.1 6.5 11.5A6.5 6.5 0 0 1 5.5 14C5.5 10.6 8.4 6.9 12 2.5Z" fill="#E0484F" />
            </svg>
            <Typography fontWeight={650} letterSpacing="-0.02em">
              Donor<span className="accent" style={{ fontSize: '1.12em' }}>Connect</span>
            </Typography>
          </Stack>
        </Link>
        <Box className="rise">{aside}</Box>
        <Typography variant="caption" sx={{ color: 'rgba(243,236,224,0.5)' }}>
          Coordinated blood response
        </Typography>
      </Box>
      <Box display="flex" flexDirection="column" px={{ xs: 2.5, sm: 6 }} py={{ xs: 3, md: 6 }}>
        <Box display={{ md: 'none' }} mb={5}>
          <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            <Logo />
          </Link>
        </Box>
        <Box width="100%" maxWidth={520} mx="auto" my="auto" className="rise">
          {children}
        </Box>
      </Box>
    </Box>
  )
}
