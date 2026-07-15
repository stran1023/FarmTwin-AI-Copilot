import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Nunito_Sans, Fraunces } from 'next/font/google'
import { TopNav } from '@/components/TopNav'
import './globals.css'

const nunito = Nunito_Sans({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'FarmTwin — AI Farm Copilot',
  description:
    'A living digital twin of your integrated farm. Monitor fish ponds, poultry, rice, and orchards, and act on AI recommendations grounded in real data.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f6f4ec',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${nunito.variable} ${fraunces.variable} bg-background`}>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <div className="flex min-h-dvh flex-col">
          <TopNav />
          <main className="flex-1">{children}</main>
        </div>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
