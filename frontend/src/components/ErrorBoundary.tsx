'use client'

import React from 'react'

interface State {
  hasError: boolean
}

// Rendered outside the MUI theme provider, so it uses plain styles on purpose.
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error(error)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#F3ECE0', color: '#1E1916' }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontWeight: 400, fontSize: 40, margin: '0 0 8px' }}>
            Something <em>went wrong</em>
          </h1>
          <p style={{ color: '#6A5F55', margin: '0 0 24px' }}>The page hit an unexpected error. Reloading usually fixes it.</p>
          <button
            onClick={() => window.location.reload()}
            style={{ background: '#9E1B22', color: '#FFF9F3', border: 0, borderRadius: 999, padding: '10px 22px', fontWeight: 600, cursor: 'pointer' }}
          >
            Reload page
          </button>
        </div>
      </main>
    )
  }
}

export default ErrorBoundary
