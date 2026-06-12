import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hotspot Portal',
  description: 'Captive portal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
