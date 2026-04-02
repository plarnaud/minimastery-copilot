'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  // If already logged in, redirect home
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace('/')
      } else {
        setCheckingSession(false)
      }
    })
  }, [])

  // Listen for auth changes (user clicks magic link in another tab)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.replace('/')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  if (checkingSession) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center text-muted text-sm">
        Loading...
      </div>
    )
  }

  if (sent) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-card rounded-lg border border-card-border p-8">
          <div className="text-4xl mb-4">📧</div>
          <h1 className="text-xl font-bold mb-2 text-heading">Check your email</h1>
          <p className="text-muted text-sm mb-4">
            We sent a magic link to <strong className="text-foreground">{email}</strong>.
            <br />Click the link to sign in — it may take a minute to arrive.
          </p>
          <p className="text-xs text-muted opacity-60 mb-6">
            Check your spam folder if you don't see it.
          </p>
          <button
            onClick={() => { setSent(false); setEmail('') }}
            className="text-sm text-amber hover:text-amber-hover underline underline-offset-2 transition-colors"
          >
            Use a different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-card rounded-lg border border-card-border p-8">
        {/* Branding */}
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🎨</div>
          <h1 className="text-xl font-bold mb-1 text-heading">Sign in to MiniMastery</h1>
          <p className="text-muted text-sm">
            Get AI-powered painting plans for your miniatures.
            <br />No password needed — we'll email you a sign-in link.
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            autoFocus
            className="w-full rounded-md border border-card-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-amber focus:border-transparent mb-3"
          />

          {error && (
            <div className="mb-3 p-2 bg-deep-red/20 border border-deep-red rounded text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full py-2.5 bg-gradient-to-b from-amber to-amber-dim text-background font-bold rounded-md hover:from-amber-hover hover:to-amber disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber/20"
          >
            {loading ? 'Sending link...' : 'Continue with Email'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-card-border text-center">
          <p className="text-xs text-muted">
            Free account — 5 painting plans per month.
            <br />No credit card required.
          </p>
        </div>
      </div>
    </div>
  )
}
