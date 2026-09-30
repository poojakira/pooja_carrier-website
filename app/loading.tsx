export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div
        className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-4 text-sm text-slate-300"
        role="status"
        aria-live="polite"
      >
        Loading…
      </div>
    </main>
  )
}
