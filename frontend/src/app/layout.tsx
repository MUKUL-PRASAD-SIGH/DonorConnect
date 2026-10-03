import type { Metadata, Viewport } from 'next'
import { Providers } from './providers'
import ErrorBoundary from '@/components/ErrorBoundary'
// Self-hosted so builds and dev servers never depend on reaching Google Fonts
import '@fontsource-variable/inter'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import './globals.css'


export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'DonorConnect — Coordinated blood response',
  description:
    'DonorConnect coordinates blood donors instead of broadcasting to them: ranked invite waves with held slots, verified live request links, shortage forecasting and a rare-blood registry.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'DonorConnect' },
  openGraph: {
    title: 'DonorConnect — Coordinated blood response',
    description: 'The right donors, the right number, at the right time.',
    type: 'website',
    locale: 'en_IN',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F3ECE0',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}
