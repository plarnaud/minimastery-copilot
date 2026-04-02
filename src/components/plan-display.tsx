'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function PlanDisplay({
  plan,
  planId,
  saveError,
}: {
  plan: any
  planId: string | null
  saveError?: string | null
}) {
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null)
  const supabase = createClient()

  async function submitFeedback(type: 'positive' | 'negative') {
    setFeedback(type)
    if (planId) {
      await supabase
        .from('session_plans')
        .update({ feedback: type })
        .eq('id', planId)
    }
  }

  return (
    <div className="bg-card rounded-lg border border-card-border p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-heading">{plan.title}</h2>
        <div className="flex items-center gap-3 mt-2 text-sm text-muted flex-wrap">
          <span className="inline-block px-2 py-0.5 bg-amber/15 text-amber rounded text-xs font-medium">
            {plan.style}
          </span>
          <span>~{plan.estimated_time_min} min</span>
          <span>{plan.paints?.length} paints</span>
          <span>{plan.steps?.length} steps</span>
        </div>
      </div>

      {/* Paint checklist */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-amber mb-3 uppercase tracking-wider">Paint Checklist</h3>
        <div className="space-y-2">
          {plan.paints?.map((paint: any, i: number) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <div
                className="w-8 h-8 rounded-md border-2 border-card-border flex-shrink-0 shadow-sm"
                style={{ backgroundColor: paint.hex_color || '#ccc' }}
              />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-heading">{paint.name}</span>
                <span className="text-muted ml-2 text-xs">
                  {paint.brand} {paint.paint_type}
                </span>
              </div>
              <span className="text-xs text-muted hidden sm:inline">{paint.purpose}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-amber mb-3 uppercase tracking-wider">Step-by-Step Plan</h3>
        <div className="space-y-3">
          {plan.steps?.map((step: any) => (
            <div key={step.order} className="flex gap-3">
              <div className="w-7 h-7 bg-amber text-background rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm">
                {step.order}
              </div>
              <div className="text-sm pt-0.5">
                <p className="text-foreground">{step.instruction}</p>
                {step.paint_name && (
                  <p className="text-muted text-xs mt-0.5">
                    {step.paint_name} — {step.technique}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Basing */}
      {plan.basing?.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-amber mb-3 uppercase tracking-wider">Basing Plan</h3>
          <div className="space-y-3">
            {plan.basing.map((step: any) => (
              <div key={step.order} className="flex gap-3">
                <div className="w-7 h-7 bg-deep-red text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm">
                  B{step.order}
                </div>
                <div className="text-sm pt-0.5">
                  <p className="text-foreground">{step.instruction}</p>
                  <p className="text-muted text-xs mt-0.5">
                    Materials: {step.materials?.join(', ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save error */}
      {saveError && (
        <div className="mb-4 p-3 bg-amber/10 border border-amber-dim rounded-md text-sm text-amber">
          {saveError}
        </div>
      )}

      {/* Feedback + AI note */}
      <div className="border-t border-card-border pt-4 flex items-center justify-between">
        <p className="text-xs text-muted">
          AI-generated plan — verify paint names against your collection
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => submitFeedback('positive')}
            className={`px-3 py-1 text-sm rounded border transition-colors ${
              feedback === 'positive'
                ? 'bg-green-900/30 border-green-600 text-green-400'
                : 'border-card-border text-muted hover:border-green-700 hover:text-green-400'
            }`}
          >
            👍
          </button>
          <button
            onClick={() => submitFeedback('negative')}
            className={`px-3 py-1 text-sm rounded border transition-colors ${
              feedback === 'negative'
                ? 'bg-red-900/30 border-red-600 text-red-400'
                : 'border-card-border text-muted hover:border-red-700 hover:text-red-400'
            }`}
          >
            👎
          </button>
        </div>
      </div>
    </div>
  )
}
