import Link from 'next/link'

export default function NotFound() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 72, color: '#9E1B22', margin: 0, lineHeight: 1 }}>404</p>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 36, margin: '12px 0 8px' }}>
          This page <em>doesn’t exist</em>
        </h1>
        <p style={{ color: '#6A5F55', margin: '0 0 28px' }}>If someone forwarded you a request link, check it wasn’t cut off.</p>
        <Link
          href="/"
          style={{ background: '#9E1B22', color: '#FFF9F3', borderRadius: 999, padding: '10px 22px', fontWeight: 600, textDecoration: 'none' }}
        >
          Go home
        </Link>
      </div>
    </main>
  )
}
