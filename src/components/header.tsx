'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function Header() {
  const [email, setEmail] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setEmail(user.email ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setEmail(session?.user?.email ?? null)
      } else if (event === 'SIGNED_OUT') {
        setEmail(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setEmail(null)
    router.push('/')
  }

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <a href="/" className="font-bold text-lg tracking-tight">
          MiniMastery
        </a>
        <nav className="flex items-center gap-4 text-sm">
          {email ? (
            <>
              <a
                href="/collection"
                className="text-stone-500 hover:text-stone-900 transition-colors"
              >
                My Collection
              </a>
              <span className="text-stone-400 text-xs hidden sm:inline">{email}</span>
              <button
                onClick={handleSignOut}
                className="text-stone-400 hover:text-stone-700 transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <a
              href="/auth/login"
              className="text-stone-500 hover:text-stone-900 transition-colors"
            >
              Sign in
            </a>
          )}
        </nav>
      </div>
    </header>
  )
}
