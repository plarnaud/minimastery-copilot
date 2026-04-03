'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { findVideoForPhase, findVideoForStep, youtubeEmbedUrl, youtubeSearchUrl } from '@/lib/technique-videos'

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
  const [addedPaints, setAddedPaints] = useState<Map<string, 'owned' | 'wishlist'>>(new Map())
  const [addingPaint, setAddingPaint] = useState<string | null>(null)
  const supabase = createClient()

  // Merge original owned set with paints added during this session
  const ownedSet = new Set(ownedPaintNames.map(n => n.toLowerCase().trim()))
  for (const [name, status] of addedPaints) {
    if (status === 'owned') ownedSet.add(name)
  }
  const hasInventory = ownedSet.size > 0 || addedPaints.size > 0

  function paintStatus(paintName: string): 'have' | 'missing' | 'wishlisted' | null {
    const key = paintName.toLowerCase().trim()
    if (ownedSet.has(key)) return 'have'
    if (addedPaints.get(key) === 'wishlist') return 'wishlisted'
    if (hasInventory) return 'missing'
    return null
  }

  async function submitFeedback(type: 'positive' | 'negative') {
    setFeedback(type)
    if (planId) {
      await supabase.from('session_plans').update({ feedback: type }).eq('id', planId)
    }
  }

  const addPaintToInventory = useCallback(async (paintName: string, status: 'owned' | 'wishlist') => {
    setAddingPaint(paintName)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: matches } = await supabase
        .from('paint_catalog')
        .select('id')
        .ilike('name', paintName)
        .limit(1)

      if (matches && matches.length > 0) {
        await supabase
          .from('user_inventory')
          .upsert({ user_id: user.id, paint_id: matches[0].id, status }, { onConflict: 'user_id,paint_id' })
        setAddedPaints(prev => new Map(prev).set(paintName.toLowerCase().trim(), status))
      }
    } finally {
      setAddingPaint(null)
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
  const missingPaints = hasInventory
    ? (plan.paints || []).filter((p: any) => { const s = paintStatus(p.name); return s === 'missing' || s === 'wishlisted' })
    : []

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
                  const isLoading = addingPaint === paint.name
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-md border transition-colors ${
                        status === 'have'
                          ? 'bg-green-900/10 border-green-800/30'
                          : status === 'wishlisted'
                          ? 'bg-amber/5 border-amber/20'
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
                      <PaintActions
                        status={status}
                        isLoading={isLoading}
                        paintName={paint.name}
                        paintBrand={paint.brand}
                        onOwned={() => addPaintToInventory(paint.name, 'owned')}
                        onWishlist={() => addPaintToInventory(paint.name, 'wishlist')}
                      />
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
              const status = paintStatus(paint.name)
              const isLoading = addingPaint === paint.name
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
                  <PaintActions
                    status={status}
                    isLoading={isLoading}
                    paintName={paint.name}
                    paintBrand={paint.brand}
                    onOwned={() => addPaintToInventory(paint.name, 'owned')}
                    onWishlist={() => addPaintToInventory(paint.name, 'wishlist')}
                    showBuyLabel
                  />
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
      {phases.map((phase, pi) => {
        const phaseVideo = phase.label ? findVideoForPhase(phase.label) : null
        return (
          <div key={pi} className="bg-card rounded-lg border border-card-border p-5">
            {/* Phase header */}
            {phase.label ? (
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-semibold text-amber uppercase tracking-wider">
                  {phase.label}
                </h3>
                <div className="h-px flex-1 bg-card-border" />
                <span className="text-[10px] text-muted">{phase.steps.length} steps</span>
              </div>
            ) : (
              <h3 className="text-sm font-semibold text-amber mb-4 uppercase tracking-wider">
                Step-by-Step Plan
              </h3>
            )}

            {/* Tutorial video for this phase */}
            {phaseVideo && (
              <PhaseVideo video={phaseVideo} phaseLabel={phase.label || 'painting'} />
            )}
            {!phaseVideo && phase.label && (
              <a
                href={youtubeSearchUrl(phase.label)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 mb-4 px-3 py-2 rounded-md bg-red-900/10 border border-red-900/20 text-xs text-red-300 hover:bg-red-900/20 transition-colors"
              >
                <span>▶</span>
                <span>Search tutorials for "{phase.label}" on YouTube</span>
              </a>
            )}

            {/* Steps */}
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
        )
      })}

      {/* ── BASING ── */}
      {plan.basing?.length > 0 && (
        <div className="bg-card rounded-lg border border-card-border p-5">
          <h3 className="text-sm font-semibold text-amber mb-4 uppercase tracking-wider">
            Basing Plan
          </h3>
          <PhaseVideo video={findVideoForPhase('basing')!} phaseLabel="basing" />
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

function PhaseVideo({ video, phaseLabel }: { video: { videoId: string; title: string; channel: string } | null; phaseLabel: string }) {
  const [expanded, setExpanded] = useState(false)

  if (!video) return null

  return (
    <div className="mb-4">
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md bg-red-900/10 border border-red-900/20 hover:bg-red-900/20 transition-colors text-left group"
        >
          <div className="w-8 h-8 bg-red-600 rounded-md flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm ml-0.5">▶</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-heading group-hover:text-red-300 transition-colors">
              {video.title}
            </p>
            <p className="text-[10px] text-muted">{video.channel} · Watch tutorial</p>
          </div>
        </button>
      ) : (
        <div className="rounded-md overflow-hidden border border-card-border">
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              className="absolute inset-0 w-full h-full"
              src={youtubeEmbedUrl(video.videoId)}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <button
            onClick={() => setExpanded(false)}
            className="w-full px-3 py-1.5 text-[10px] text-muted hover:text-foreground bg-background transition-colors"
          >
            Hide video
          </button>
        </div>
      )}
    </div>
  )
}

function PaintActions({
  status,
  isLoading,
  paintName,
  paintBrand,
  onOwned,
  onWishlist,
  showBuyLabel = false,
}: {
  status: 'have' | 'missing' | 'wishlisted' | null
  isLoading: boolean
  paintName: string
  paintBrand: string
  onOwned: () => void
  onWishlist: () => void
  showBuyLabel?: boolean
}) {
  if (status === 'have') {
    return <span className="text-[10px] font-semibold text-green-400 flex-shrink-0">OWN</span>
  }

  if (status === 'wishlisted') {
    return (
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-[10px] text-amber">wishlisted</span>
        <button
          onClick={onOwned}
          disabled={isLoading}
          className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/20 text-green-400 border border-green-800/30 hover:bg-green-900/30 transition-colors disabled:opacity-50"
        >
          {isLoading ? '...' : 'got it'}
        </button>
      </div>
    )
  }

  if (status === 'missing') {
    return (
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={onOwned}
          disabled={isLoading}
          className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/20 text-green-400 border border-green-800/30 hover:bg-green-900/30 transition-colors disabled:opacity-50"
        >
          {isLoading ? '...' : 'have it'}
        </button>
        <button
          onClick={onWishlist}
          disabled={isLoading}
          className="text-[10px] px-1.5 py-0.5 rounded bg-amber/10 text-amber border border-amber/30 hover:bg-amber/20 transition-colors disabled:opacity-50"
        >
          {isLoading ? '...' : '+ wish'}
        </button>
        <a
          href={amazonSearchUrl(paintName, paintBrand)}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-[10px] px-1.5 py-0.5 rounded bg-blue-900/20 text-blue-300 border border-blue-800/30 hover:bg-blue-900/30 transition-colors`}
        >
          {showBuyLabel ? 'Buy on Amazon' : 'buy'}
        </a>
      </div>
    )
  }

  // No inventory
  return (
    <a
      href={amazonSearchUrl(paintName, paintBrand)}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[10px] px-1.5 py-0.5 rounded text-muted hover:text-blue-300 transition-colors flex-shrink-0"
    >
      buy
    </a>
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
