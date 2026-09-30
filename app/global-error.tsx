'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body>
        <main
          style={{
            minHeight: '100vh',
            background: '#020617',
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <section style={{ maxWidth: '520px' }}>
            <h1>Application error</h1>
            <p>The application could not complete this request.</p>
            <button type="button" onClick={reset}>
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  )
}
