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

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace('/')
      } else {
        setCheckingSession(false)
      }
    })
  }, [])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.replace('/')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleGoogleLogin() {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) setError(error.message)
  }

  async function handleEmailLogin(e: React.FormEvent) {
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
          </p>
        </div>

        {/* Google Sign-In */}
        <button
          onClick={handleGoogleLogin}
          className="w-full py-2.5 bg-white text-gray-800 font-medium rounded-md hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 border border-gray-300 mb-4"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-card-border" />
          <span className="text-xs text-muted">or</span>
          <div className="h-px flex-1 bg-card-border" />
        </div>

        {/* Email magic link */}
        <form onSubmit={handleEmailLogin}>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
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
            className="w-full py-2.5 border border-card-border text-foreground font-medium rounded-md hover:border-amber hover:text-amber disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
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
