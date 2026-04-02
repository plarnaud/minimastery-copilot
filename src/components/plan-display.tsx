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
      await supabase.from('session_plans').update({ feedback: type }).eq('id', planId)
    }
  }

  // Group paints by type
  const paintsByType: Record<string, any[]> = {}
  for (const paint of plan.paints || []) {
    const type = paint.paint_type || 'other'
    if (!paintsByType[type]) paintsByType[type] = []
    paintsByType[type].push(paint)
  }
  const typeOrder = ['base', 'layer', 'shade', 'contrast', 'dry', 'technical', 'spray', 'air', 'other']
  const sortedPaintTypes = Object.keys(paintsByType).sort((a, b) =>
    (typeOrder.indexOf(a) === -1 ? 99 : typeOrder.indexOf(a)) - (typeOrder.indexOf(b) === -1 ? 99 : typeOrder.indexOf(b))
  )

  // Group steps into phases based on technique patterns
  const phases = groupStepsIntoPhases(plan.steps || [])

  return (
    <div className="space-y-4">
      {/* ── HEADER CARD ── */}
      <div className="bg-card rounded-lg border border-card-border p-5">
        <h2 className="text-xl font-bold text-heading">{plan.title}</h2>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="inline-block px-2.5 py-1 bg-amber/15 text-amber rounded-md text-xs font-semibold">
            {plan.style}
          </span>
          <span className="text-xs text-muted px-2 py-1 bg-background rounded-md">
            ~{plan.estimated_time_min} min
          </span>
          <span className="text-xs text-muted px-2 py-1 bg-background rounded-md">
            {plan.paints?.length} paints
          </span>
          <span className="text-xs text-muted px-2 py-1 bg-background rounded-md">
            {plan.steps?.length} steps
          </span>
        </div>
      </div>

      {/* ── PAINTS BY TYPE ── */}
      <div className="bg-card rounded-lg border border-card-border p-5">
        <h3 className="text-sm font-semibold text-amber mb-4 uppercase tracking-wider">
          Paints You'll Need
        </h3>
        <div className="space-y-4">
          {sortedPaintTypes.map(type => (
            <div key={type}>
              <p className="text-[11px] font-medium text-muted uppercase tracking-wide mb-2">
                {type} paints ({paintsByType[type].length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {paintsByType[type].map((paint: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-background/50 border border-transparent hover:border-card-border transition-colors"
                  >
                    <div
                      className="w-8 h-8 rounded-md border-2 border-card-border flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: paint.hex_color || '#555' }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-heading truncate">{paint.name}</p>
                      <p className="text-[11px] text-muted truncate">{paint.purpose}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-card-border">
          <p className="text-[11px] text-muted">
            Total: {plan.paints?.length} paints across {sortedPaintTypes.length} types
          </p>
        </div>
      </div>

      {/* ── STEP-BY-STEP ── */}
      <div className="bg-card rounded-lg border border-card-border p-5">
        <h3 className="text-sm font-semibold text-amber mb-4 uppercase tracking-wider">
          Step-by-Step Plan
        </h3>
        <div className="space-y-6">
          {phases.map((phase, pi) => (
            <div key={pi}>
              {phase.label && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-card-border" />
                  <span className="text-[11px] font-medium text-muted uppercase tracking-wide px-1">
                    {phase.label}
                  </span>
                  <div className="h-px flex-1 bg-card-border" />
                </div>
              )}
              <div className="space-y-2.5">
                {phase.steps.map((step: any) => (
                  <div key={step.order} className="flex gap-3 group">
                    <div className="w-7 h-7 bg-amber text-background rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm mt-0.5">
                      {step.order}
                    </div>
                    <div className="flex-1 pb-2.5 border-b border-card-border/50 group-last:border-0">
                      <p className="text-sm text-foreground leading-relaxed">{step.instruction}</p>
                      {step.paint_name && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-xs text-amber">{step.paint_name}</span>
                          <span className="text-[10px] text-muted">· {step.technique}</span>
                        </div>
                      )}
                      {!step.paint_name && step.technique && (
                        <span className="text-[10px] text-muted mt-0.5 inline-block">{step.technique}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── BASING ── */}
      {plan.basing?.length > 0 && (
        <div className="bg-card rounded-lg border border-card-border p-5">
          <h3 className="text-sm font-semibold text-amber mb-4 uppercase tracking-wider">
            Basing Plan
          </h3>
          <div className="space-y-3">
            {plan.basing.map((step: any) => (
              <div key={step.order} className="flex gap-3">
                <div className="w-7 h-7 bg-deep-red text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm mt-0.5">
                  B{step.order}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground leading-relaxed">{step.instruction}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {step.materials?.map((mat: string, i: number) => (
                      <span key={i} className="text-[11px] px-2 py-0.5 bg-deep-red/15 text-red-300 rounded">
                        {mat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SAVE ERROR ── */}
      {saveError && (
        <div className="p-3 bg-amber/10 border border-amber-dim rounded-md text-sm text-amber">
          {saveError}
        </div>
      )}

      {/* ── FEEDBACK ── */}
      <div className="bg-card rounded-lg border border-card-border p-4 flex items-center justify-between">
        <p className="text-xs text-muted">
          AI-generated — verify paint names against your pots
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => submitFeedback('positive')}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              feedback === 'positive'
                ? 'bg-green-900/30 border-green-600 text-green-400'
                : 'border-card-border text-muted hover:border-green-700 hover:text-green-400'
            }`}
          >
            👍 Helpful
          </button>
          <button
            onClick={() => submitFeedback('negative')}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              feedback === 'negative'
                ? 'bg-red-900/30 border-red-600 text-red-400'
                : 'border-card-border text-muted hover:border-red-700 hover:text-red-400'
            }`}
          >
            👎 Off
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Group steps into phases based on technique patterns.
 * Tries to detect natural phases like "Prep", "Basecoats", "Details", "Finishing"
 */
function groupStepsIntoPhases(steps: any[]) {
  if (steps.length <= 4) {
    return [{ label: null, steps }]
  }

  const phases: { label: string | null; steps: any[] }[] = []
  let currentPhase: { label: string | null; steps: any[] } = { label: 'Preparation', steps: [] }

  const prepTechniques = new Set(['prime', 'priming', 'assembly', 'cleanup', 'prep', 'preparation', 'basecoat'])
  const detailTechniques = new Set(['edge highlight', 'highlight', 'detail', 'line', 'dot', 'fine detail'])
  const finishTechniques = new Set(['varnish', 'seal', 'matte', 'gloss', 'finish', 'final'])

  for (const step of steps) {
    const tech = (step.technique || '').toLowerCase()
    const instr = (step.instruction || '').toLowerCase()

    if (currentPhase.steps.length > 0) {
      // Detect phase transitions
      if (currentPhase.label === 'Preparation' && !prepTechniques.has(tech) && !instr.includes('prime') && !instr.includes('assemble')) {
        phases.push(currentPhase)
        if (tech === 'wash' || tech === 'shade' || instr.includes('wash') || instr.includes('shade')) {
          currentPhase = { label: 'Shading & Washes', steps: [] }
        } else {
          currentPhase = { label: 'Base Colors', steps: [] }
        }
      } else if (currentPhase.label === 'Base Colors' && (tech === 'wash' || tech === 'shade' || instr.includes('wash') || instr.includes('shade'))) {
        phases.push(currentPhase)
        currentPhase = { label: 'Shading & Washes', steps: [] }
      } else if (
        (currentPhase.label === 'Base Colors' || currentPhase.label === 'Shading & Washes') &&
        (detailTechniques.has(tech) || instr.includes('highlight') || instr.includes('edge') || instr.includes('detail'))
      ) {
        phases.push(currentPhase)
        currentPhase = { label: 'Highlights & Details', steps: [] }
      } else if (finishTechniques.has(tech) || instr.includes('varnish') || instr.includes('seal')) {
        if (currentPhase.label !== 'Finishing') {
          phases.push(currentPhase)
          currentPhase = { label: 'Finishing', steps: [] }
        }
      }
    }

    currentPhase.steps.push(step)
  }

  if (currentPhase.steps.length > 0) {
    phases.push(currentPhase)
  }

  // If we only got one phase, don't bother labeling
  if (phases.length <= 1) {
    return [{ label: null, steps }]
  }

  return phases
}
