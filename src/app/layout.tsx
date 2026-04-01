import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'MiniMastery — Know What You Need Before You Paint',
  description:
    'AI-powered painting session prep for miniature painters. Generate step-by-step plans, check your paint inventory, and never sit down unprepared again.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900">
        <header className="border-b border-stone-200 bg-white">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="/" className="font-bold text-lg tracking-tight">
              MiniMastery
            </a>
            <nav className="flex items-center gap-4 text-sm">
              <a
                href="/collection"
                className="text-stone-500 hover:text-stone-900 transition-colors"
              >
                My Collection
              </a>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-stone-200 bg-white mt-auto">
          <div className="max-w-2xl mx-auto px-4 py-4 text-center text-xs text-stone-400">
            MiniMastery — AI-powered painting session prep
          </div>
        </footer>
      </body>
    </html>
  )
}
