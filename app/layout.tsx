import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Career OS — Pooja Kiran',
  description: 'Personal career automation tool',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1e2235',
              color: '#e2e8f0',
              border: '1px solid #374151',
              fontSize: '13px',
            },
          }}
        />
      </body>
    </html>
  )
}
