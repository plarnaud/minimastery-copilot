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
    <header className="border-b border-card-border bg-card relative z-10">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 group">
          <span className="font-bold text-lg tracking-tight text-amber group-hover:text-amber-hover transition-colors">
            MiniMastery
          </span>
          <span className="text-xs text-muted hidden sm:inline tracking-wide">
            Session Prep
          </span>
        </a>
        <nav className="flex items-center gap-4 text-sm">
          {email ? (
            <>
              <a
                href="/collection"
                className="text-muted hover:text-amber transition-colors"
              >
                My Collection
              </a>
              <span className="text-muted text-xs hidden sm:inline opacity-60">{email}</span>
              <button
                onClick={handleSignOut}
                className="text-muted hover:text-foreground transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <a
              href="/auth/login"
              className="text-muted hover:text-amber transition-colors"
            >
              Sign in
            </a>
          )}
        </nav>
      </div>
    </header>
  )
}
