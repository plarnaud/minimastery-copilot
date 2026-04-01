'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Supabase magic links can arrive as:
    // 1. Hash fragment: /auth/callback#access_token=...&type=magiclink
    // 2. Query param: /auth/callback?code=...  (PKCE flow)
    // The Supabase client automatically picks up hash fragments on init,
    // so we just need to check if a session exists after a moment.

    async function handleCallback() {
      // Give Supabase client a moment to process the hash fragment
      await new Promise((resolve) => setTimeout(resolve, 500))

      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        setError(sessionError.message)
        return
      }

      if (session) {
        router.replace('/')
        return
      }

      // Try exchanging code if present (PKCE flow)
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          setError(exchangeError.message)
          return
        }
        router.replace('/')
        return
      }

      // No session and no code — something went wrong
      setError('Could not verify magic link. It may have expired — try signing in again.')
    }

    handleCallback()
  }, [])

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-lg border border-stone-200 p-8">
          <div className="text-3xl mb-3">😕</div>
          <h1 className="text-lg font-bold mb-2">Sign in failed</h1>
          <p className="text-stone-500 text-sm mb-4">{error}</p>
          <a
            href="/auth/login"
            className="inline-block px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-md hover:bg-stone-800 transition-colors"
          >
            Try again
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="bg-white rounded-lg border border-stone-200 p-8">
        <div className="w-5 h-5 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-stone-500">Signing you in...</p>
      </div>
    </div>
  )
}
