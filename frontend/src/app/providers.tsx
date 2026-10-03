'use client'

import { Provider } from 'react-redux'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { Toaster } from 'sonner'
import { store } from '@/store'
import { theme } from '@/theme'
import { tokens } from '@/theme/tokens'
import AuthWrapper from '@/components/AuthWrapper'
import SmoothScroll from '@/components/SmoothScroll'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SmoothScroll />
        <AuthWrapper>{children}</AuthWrapper>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: tokens.surface,
              color: tokens.ink,
              border: `1px solid ${tokens.line}`,
              borderRadius: 14,
              fontFamily: 'var(--font-sans)',
            },
          }}
        />
      </ThemeProvider>
    </Provider>
  )
}
