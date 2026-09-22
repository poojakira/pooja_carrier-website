'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [accessKey, setAccessKey] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessKey }),
      })
      if (!response.ok) {
        setError(response.status === 503 ? 'Server authentication is not configured.' : 'Invalid access key.')
        return
      }
      router.replace('/')
      router.refresh()
    } catch {
      setError('Unable to sign in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-xl border p-6">
        <div>
          <h1 className="text-2xl font-semibold">Career OS</h1>
          <p className="mt-2 text-sm opacity-70">Authenticate to access resume, AI, PDF, and email actions.</p>
        </div>
        <label className="block">
          <span className="text-sm font-medium">Access key</span>
          <input
            type="password"
            autoComplete="current-password"
            value={accessKey}
            onChange={(event) => setAccessKey(event.target.value)}
            minLength={32}
            required
            className="mt-2 w-full rounded border px-3 py-2"
          />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
