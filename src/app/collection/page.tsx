'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface CatalogPaint {
  id: string
  name: string
  brand: string
  paint_type: string
  hex_color: string | null
}

interface SavedPlan {
  id: string
  input_text: string
  plan_json: any
  created_at: string
}

export default function CollectionPage() {
  const [tab, setTab] = useState<'inventory' | 'plans'>('inventory')
  const [paints, setPaints] = useState<CatalogPaint[]>([])
  const [ownedPaintIds, setOwnedPaintIds] = useState<Set<string>>(new Set())
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBrand, setSelectedBrand] = useState('citadel')
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    // Load paint catalog
    const { data: catalogPaints } = await supabase
      .from('paint_catalog')
      .select('id, name, brand, paint_type, hex_color')
      .order('paint_type')
      .order('name')

    if (catalogPaints) setPaints(catalogPaints)

    // Load user inventory
    const { data: inventory } = await supabase
      .from('user_inventory')
      .select('paint_id')
      .eq('user_id', user.id)
      .eq('status', 'owned')

    if (inventory) {
      setOwnedPaintIds(new Set(inventory.map((i) => i.paint_id)))
    }

    // Load saved plans
    const { data: plans } = await supabase
      .from('session_plans')
      .select('id, input_text, plan_json, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (plans) setSavedPlans(plans)

    setLoading(false)
  }

  async function togglePaint(paintId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setSaving(true)
    const newOwned = new Set(ownedPaintIds)

    if (newOwned.has(paintId)) {
      // Remove from inventory
      newOwned.delete(paintId)
      await supabase
        .from('user_inventory')
        .delete()
        .eq('user_id', user.id)
        .eq('paint_id', paintId)
    } else {
      // Add to inventory
      newOwned.add(paintId)
      await supabase
        .from('user_inventory')
        .insert({ user_id: user.id, paint_id: paintId, status: 'owned' })
    }

    setOwnedPaintIds(newOwned)
    setSaving(false)
  }

  const filteredPaints = paints.filter((p) => {
    if (p.brand !== selectedBrand) return false
    if (selectedType && p.paint_type !== selectedType) return false
    return true
  })

  const paintTypes = [...new Set(
    paints.filter((p) => p.brand === selectedBrand).map((p) => p.paint_type)
  )].sort()

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center text-muted">
        Loading...
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-heading">My Collection</h1>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-card-border">
        <button
          onClick={() => setTab('inventory')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'inventory'
              ? 'border-amber text-amber'
              : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          Paint Inventory ({ownedPaintIds.size})
        </button>
        <button
          onClick={() => setTab('plans')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'plans'
              ? 'border-amber text-amber'
              : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          Saved Plans ({savedPlans.length})
        </button>
      </div>

      {tab === 'inventory' && (
        <div>
          {/* Brand selector */}
          <div className="flex gap-2 mb-4">
            {['citadel', 'vallejo', 'army_painter'].map((brand) => (
              <button
                key={brand}
                onClick={() => { setSelectedBrand(brand); setSelectedType(null) }}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  selectedBrand === brand
                    ? 'bg-amber text-background border-amber font-semibold'
                    : 'border-card-border text-muted hover:border-amber hover:text-amber'
                }`}
              >
                {brand === 'citadel' ? 'Citadel' : brand === 'vallejo' ? 'Vallejo' : 'Army Painter'}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <div className="flex gap-1.5 mb-4 flex-wrap">
            <button
              onClick={() => setSelectedType(null)}
              className={`px-2 py-1 text-xs rounded border transition-colors ${
                !selectedType
                  ? 'bg-amber-dim text-background border-amber-dim'
                  : 'border-card-border text-muted hover:border-amber hover:text-amber'
              }`}
            >
              All
            </button>
            {paintTypes.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-2 py-1 text-xs rounded border transition-colors capitalize ${
                  selectedType === type
                    ? 'bg-amber-dim text-background border-amber-dim'
                    : 'border-card-border text-muted hover:border-amber hover:text-amber'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Paint grid */}
          <div className="space-y-1.5">
            {filteredPaints.map((paint) => (
              <button
                key={paint.id}
                onClick={() => togglePaint(paint.id)}
                disabled={saving}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left text-sm transition-colors ${
                  ownedPaintIds.has(paint.id)
                    ? 'bg-green-900/20 border border-green-700/50'
                    : 'bg-card border border-card-border hover:border-amber/40'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-md border-2 border-card-border flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: paint.hex_color || '#ccc' }}
                />
                <span className="flex-1 font-medium text-heading">{paint.name}</span>
                <span className="text-xs text-muted capitalize">{paint.paint_type}</span>
                {ownedPaintIds.has(paint.id) && (
                  <span className="text-xs text-green-400 font-semibold">Owned</span>
                )}
              </button>
            ))}
            {filteredPaints.length === 0 && (
              <p className="text-sm text-muted text-center py-8">
                No paints found for this brand. Paint catalog data may not be loaded yet.
              </p>
            )}
          </div>
        </div>
      )}

      {tab === 'plans' && (
        <div className="space-y-3">
          {savedPlans.map((plan) => (
            <div
              key={plan.id}
              className="bg-card rounded-md border border-card-border p-4 hover:border-amber/30 transition-colors"
            >
              <h3 className="font-medium text-sm text-heading">
                {plan.plan_json?.title || plan.input_text}
              </h3>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                <span className="text-amber">{plan.plan_json?.style}</span>
                <span>{plan.plan_json?.paints?.length} paints</span>
                <span>{plan.plan_json?.steps?.length} steps</span>
                <span>{new Date(plan.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {savedPlans.length === 0 && (
            <p className="text-sm text-muted text-center py-8">
              No saved plans yet. Generate your first plan from the home page.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
