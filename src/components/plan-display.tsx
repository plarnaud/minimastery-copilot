'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

function amazonSearchUrl(paintName: string, brand: string): string {
  const query = encodeURIComponent(`${brand} ${paintName} miniature paint`)
  return `https://www.amazon.com/s?k=${query}&tag=minimastery-20`
}

export function PlanDisplay({
  plan,
  planId,
  saveError,
  ownedPaintNames = [],
}: {
  plan: any
  planId: string | null
  saveError?: string | null
  ownedPaintNames?: string[]
}) {
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null)
  const [wishlisted, setWishlisted] = useState<Set<string>>(new Set())
  const [wishlistLoading, setWishlistLoading] = useState<string | null>(null)
  const supabase = createClient()

  // Normalize owned paint names for matching
  const ownedSet = new Set(ownedPaintNames.map(n => n.toLowerCase().trim()))
  const hasInventory = ownedSet.size > 0

  function paintStatus(paintName: string): 'have' | 'missing' | null {
    if (!hasInventory) return null
    return ownedSet.has(paintName.toLowerCase().trim()) ? 'have' : 'missing'
  }

  async function submitFeedback(type: 'positive' | 'negative') {
    setFeedback(type)
    if (planId) {
      await supabase.from('session_plans').update({ feedback: type }).eq('id', planId)
    }
  }

  const addToWishlist = useCallback(async (paintName: string, brand: string) => {
    setWishlistLoading(paintName)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Find paint in catalog by name (case-insensitive)
      const { data: matches } = await supabase
        .from('paint_catalog')
        .select('id')
        .ilike('name', paintName)
        .limit(1)

      if (matches && matches.length > 0) {
        await supabase
          .from('user_inventory')
          .upsert({ user_id: user.id, paint_id: matches[0].id, status: 'wishlist' }, { onConflict: 'user_id,paint_id' })
        setWishlisted(prev => new Set(prev).add(paintName.toLowerCase().trim()))
      }
    } finally {
      setWishlistLoading(null)
    }
  }, [supabase])

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

  // Stats
  const totalPaints = plan.paints?.length || 0
  const ownedCount = hasInventory ? (plan.paints || []).filter((p: any) => paintStatus(p.name) === 'have').length : 0
  const missingCount = totalPaints - ownedCount
  const missingPaints = hasInventory ? (plan.paints || []).filter((p: any) => paintStatus(p.name) === 'missing') : []

  // Group steps into phases
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
            {totalPaints} paints
          </span>
          <span className="text-xs text-muted px-2 py-1 bg-background rounded-md">
            {plan.steps?.length} steps
          </span>
        </div>
      </div>

      {/* ── PAINTS BY TYPE ── */}
      <div className="bg-card rounded-lg border border-card-border p-5">
        <h3 className="text-sm font-semibold text-amber mb-3 uppercase tracking-wider">
          Paints You'll Need
        </h3>

        {/* Inventory summary */}
        {hasInventory && (
          <div className="flex items-center gap-3 mb-4 px-3 py-2.5 bg-background rounded-md border border-card-border text-xs">
            <span className="text-green-400 font-semibold">{ownedCount} owned</span>
            <span className="text-card-border">|</span>
            <span className="text-red-400 font-semibold">{missingCount} needed</span>
            <span className="text-card-border">|</span>
            <span className="text-muted">{totalPaints} total</span>
            {missingCount === 0 && (
              <span className="ml-auto text-green-400 font-semibold">Ready to paint!</span>
            )}
          </div>
        )}

        {/* Paint grid by type */}
        <div className="space-y-4">
          {sortedPaintTypes.map(type => (
            <div key={type}>
              <p className="text-[11px] font-medium text-muted uppercase tracking-wide mb-2">
                {type} paints ({paintsByType[type].length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {paintsByType[type].map((paint: any, i: number) => {
                  const status = paintStatus(paint.name)
                  const isWishlisted = wishlisted.has(paint.name.toLowerCase().trim())
                  const isLoading = wishlistLoading === paint.name
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-md border transition-colors ${
                        status === 'have'
                          ? 'bg-green-900/10 border-green-800/30'
                          : status === 'missing'
                          ? 'bg-red-900/10 border-red-900/30'
                          : 'bg-background/50 border-transparent hover:border-card-border'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-md border-2 border-card-border flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: paint.hex_color || '#555' }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-heading truncate">{paint.name}</p>
                        <p className="text-[11px] text-muted truncate">{paint.purpose}</p>
                      </div>
                      {status === 'have' && (
                        <span className="text-[10px] font-semibold text-green-400 flex-shrink-0">OWN</span>
                      )}
                      {status === 'missing' && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {isWishlisted ? (
                            <span className="text-[10px] text-amber">wishlisted</span>
                          ) : (
                            <button
                              onClick={() => addToWishlist(paint.name, paint.brand)}
                              disabled={isLoading}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-amber/10 text-amber border border-amber/30 hover:bg-amber/20 transition-colors disabled:opacity-50"
                            >
                              {isLoading ? '...' : '+ wish'}
                            </button>
                          )}
                          <a
                            href={amazonSearchUrl(paint.name, paint.brand)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/20 text-blue-300 border border-blue-800/30 hover:bg-blue-900/30 transition-colors"
                          >
                            buy
                          </a>
                        </div>
                      )}
                      {/* No inventory — show buy link for all */}
                      {status === null && (
                        <a
                          href={amazonSearchUrl(paint.name, paint.brand)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] px-1.5 py-0.5 rounded text-muted hover:text-blue-300 transition-colors flex-shrink-0"
                        >
                          buy
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-card-border flex items-center justify-between">
          <p className="text-[11px] text-muted">
            {totalPaints} paints across {sortedPaintTypes.length} types
          </p>
          {!hasInventory && (
            <a href="/collection" className="text-[11px] text-amber hover:text-amber-hover transition-colors">
              Add your paints for OWN/NEED status
            </a>
          )}
        </div>
      </div>

      {/* ── SHOPPING LIST (missing paints only) ── */}
      {hasInventory && missingPaints.length > 0 && (
        <div className="bg-card rounded-lg border border-card-border p-5">
          <h3 className="text-sm font-semibold text-amber mb-3 uppercase tracking-wider">
            Shopping List
          </h3>
          <p className="text-xs text-muted mb-3">
            {missingPaints.length} paints you need for this project
          </p>
          <div className="space-y-1.5">
            {missingPaints.map((paint: any, i: number) => {
              const isWishlisted = wishlisted.has(paint.name.toLowerCase().trim())
              const isLoading = wishlistLoading === paint.name
              return (
                <div key={i} className="flex items-center gap-3 px-3 py-2 bg-background/50 rounded-md text-sm">
                  <div
                    className="w-6 h-6 rounded border border-card-border flex-shrink-0"
                    style={{ backgroundColor: paint.hex_color || '#555' }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-heading font-medium">{paint.name}</span>
                    <span className="text-muted text-xs ml-1.5">{paint.brand} · {paint.paint_type}</span>
                  </div>
                  {isWishlisted ? (
                    <span className="text-[10px] text-amber flex-shrink-0">wishlisted</span>
                  ) : (
                    <button
                      onClick={() => addToWishlist(paint.name, paint.brand)}
                      disabled={isLoading}
                      className="text-[10px] px-2 py-0.5 rounded bg-amber/10 text-amber border border-amber/30 hover:bg-amber/20 transition-colors flex-shrink-0 disabled:opacity-50"
                    >
                      {isLoading ? '...' : '+ wishlist'}
                    </button>
                  )}
                  <a
                    href={amazonSearchUrl(paint.name, paint.brand)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2.5 py-1 rounded-md bg-blue-900/20 text-blue-300 border border-blue-800/30 hover:bg-blue-900/30 transition-colors flex-shrink-0 font-medium"
                  >
                    Buy on Amazon
                  </a>
                </div>
              )
            })}
          </div>
          <p className="text-[10px] text-muted mt-3 opacity-60">
            Links go to Amazon search results. MiniMastery may earn a commission.
          </p>
        </div>
      )}

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

  if (phases.length <= 1) {
    return [{ label: null, steps }]
  }

  return phases
}
