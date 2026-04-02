'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { PlanDisplay } from '@/components/plan-display'

interface SavedPlan {
  id: string
  input_text: string | null
  plan_json: any
  feedback: string | null
  created_at: string
}

export default function PlanDetailPage() {
  const [plan, setPlan] = useState<SavedPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const planId = params.id as string

  useEffect(() => {
    async function loadPlan() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data, error: fetchError } = await supabase
        .from('session_plans')
        .select('id, input_text, plan_json, feedback, created_at')
        .eq('id', planId)
        .eq('user_id', user.id)
        .single()

      if (fetchError || !data) {
        setError('Plan not found')
        setLoading(false)
        return
      }

      setPlan(data)
      setLoading(false)
    }

    loadPlan()
  }, [planId])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="w-2.5 h-2.5 bg-amber rounded-full animate-pulse" />
          <span className="text-sm text-muted">Loading plan...</span>
        </div>
      </div>
    )
  }

  if (error || !plan) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-card rounded-lg border border-card-border p-8">
          <h1 className="text-lg font-bold text-heading mb-2">Plan not found</h1>
          <p className="text-muted text-sm mb-4">This plan doesn't exist or you don't have access to it.</p>
          <a
            href="/collection"
            className="inline-block px-4 py-2 bg-amber text-background text-sm font-medium rounded-md hover:bg-amber-hover transition-colors"
          >
            Back to Collection
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Back link + meta */}
      <div className="mb-4 flex items-center justify-between">
        <a
          href="/collection"
          className="text-sm text-muted hover:text-amber transition-colors"
        >
          &larr; Back to Collection
        </a>
        <span className="text-xs text-muted">
          {new Date(plan.created_at).toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric',
          })}
        </span>
      </div>

      {/* Original prompt */}
      {plan.input_text && (
        <div className="mb-4 px-4 py-3 bg-card rounded-md border border-card-border">
          <p className="text-xs text-muted mb-1 uppercase tracking-wider">Original prompt</p>
          <p className="text-sm text-foreground">{plan.input_text}</p>
        </div>
      )}

      <PlanDisplay plan={plan.plan_json} planId={plan.id} />
    </div>
  )
}
