import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Portal WiFi',
  description: 'Acesse a internet',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className={`min-h-full ${inter.className}`}>
        {children}
        <style>{`nextjs-portal { display: none !important; }`}</style>
      </body>
    </html>
  )
}
