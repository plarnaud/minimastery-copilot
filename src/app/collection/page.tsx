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

interface OwnedPaint extends CatalogPaint {
  status: 'owned' | 'wishlist'
}

interface SavedPlan {
  id: string
  input_text: string
  plan_json: any
  created_at: string
}

export default function CollectionPage() {
  const [tab, setTab] = useState<'inventory' | 'wishlist' | 'plans'>('inventory')
  const [allPaints, setAllPaints] = useState<CatalogPaint[]>([])
  const [ownedPaints, setOwnedPaints] = useState<OwnedPaint[]>([])
  const [wishlistPaints, setWishlistPaints] = useState<OwnedPaint[]>([])
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Search state
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchBrand, setSearchBrand] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    setUserId(user.id)

    // Load full catalog (for search)
    const { data: catalogPaints } = await supabase
      .from('paint_catalog')
      .select('id, name, brand, paint_type, hex_color')
      .order('name')
    if (catalogPaints) setAllPaints(catalogPaints)

    // Load user inventory with paint details
    const { data: inventory } = await supabase
      .from('user_inventory')
      .select('paint_id, status, paint_catalog(id, name, brand, paint_type, hex_color)')
      .eq('user_id', user.id)

    if (inventory) {
      const owned: OwnedPaint[] = []
      const wishlist: OwnedPaint[] = []
      for (const item of inventory) {
        const paint = (item as any).paint_catalog as CatalogPaint
        if (!paint) continue
        const entry = { ...paint, status: item.status as 'owned' | 'wishlist' }
        if (item.status === 'owned') owned.push(entry)
        else if (item.status === 'wishlist') wishlist.push(entry)
      }
      setOwnedPaints(owned.sort((a, b) => a.paint_type.localeCompare(b.paint_type) || a.name.localeCompare(b.name)))
      setWishlistPaints(wishlist.sort((a, b) => a.name.localeCompare(b.name)))
    }

    // Load saved plans
    const { data: plans } = await supabase
      .from('session_plans')
      .select('id, input_text, plan_json, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (plans) setSavedPlans(plans)

    setLoading(false)
  }

  async function addPaint(paintId: string, status: 'owned' | 'wishlist') {
    if (!userId) return
    setSaving(true)
    await supabase.from('user_inventory').insert({ user_id: userId, paint_id: paintId, status })
    await loadData()
    setSaving(false)
  }

  async function removePaint(paintId: string) {
    if (!userId) return
    setSaving(true)
    await supabase.from('user_inventory').delete().eq('user_id', userId).eq('paint_id', paintId)
    await loadData()
    setSaving(false)
  }

  async function moveToOwned(paintId: string) {
    if (!userId) return
    setSaving(true)
    await supabase.from('user_inventory').update({ status: 'owned' }).eq('user_id', userId).eq('paint_id', paintId)
    await loadData()
    setSaving(false)
  }

  // Search results: exclude already owned/wishlisted paints
  const ownedIds = new Set([...ownedPaints.map(p => p.id), ...wishlistPaints.map(p => p.id)])
  const searchResults = showSearch && searchQuery.length >= 2
    ? allPaints.filter(p => {
        if (ownedIds.has(p.id)) return false
        if (searchBrand && p.brand !== searchBrand) return false
        return p.name.toLowerCase().includes(searchQuery.toLowerCase())
      }).slice(0, 20)
    : []

  // Group owned paints by type
  const ownedByType: Record<string, OwnedPaint[]> = {}
  for (const p of ownedPaints) {
    if (!ownedByType[p.paint_type]) ownedByType[p.paint_type] = []
    ownedByType[p.paint_type].push(p)
  }
  const typeOrder = ['base', 'layer', 'shade', 'contrast', 'dry', 'technical', 'spray', 'air']
  const sortedTypes = Object.keys(ownedByType).sort((a, b) =>
    (typeOrder.indexOf(a) === -1 ? 99 : typeOrder.indexOf(a)) - (typeOrder.indexOf(b) === -1 ? 99 : typeOrder.indexOf(b))
  )

  const brandLabel = (b: string) => b === 'citadel' ? 'Citadel' : b === 'vallejo' ? 'Vallejo' : b === 'army_painter' ? 'Army Painter' : b

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <div className="w-2.5 h-2.5 bg-amber rounded-full animate-pulse mx-auto" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-heading">My Collection</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-card-border">
        {[
          { key: 'inventory' as const, label: `My Paints (${ownedPaints.length})` },
          { key: 'wishlist' as const, label: `Wishlist (${wishlistPaints.length})` },
          { key: 'plans' as const, label: `Plans (${savedPlans.length})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setShowSearch(false) }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-amber text-amber'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── MY PAINTS TAB ── */}
      {tab === 'inventory' && (
        <div>
          {/* Add paint button */}
          <div className="mb-4">
            {!showSearch ? (
              <button
                onClick={() => setShowSearch(true)}
                className="w-full py-2.5 border-2 border-dashed border-card-border rounded-md text-sm text-muted hover:border-amber hover:text-amber transition-colors"
              >
                + Add paints to your collection
              </button>
            ) : (
              <div className="bg-card rounded-md border border-card-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-heading">Search paint catalog</span>
                  <button onClick={() => { setShowSearch(false); setSearchQuery('') }} className="text-xs text-muted hover:text-foreground">
                    Close
                  </button>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type a paint name..."
                  autoFocus
                  className="w-full rounded-md border border-card-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-amber focus:border-transparent mb-2"
                />
                <div className="flex gap-1.5 mb-3">
                  <button
                    onClick={() => setSearchBrand(null)}
                    className={`px-2 py-0.5 text-xs rounded transition-colors ${!searchBrand ? 'bg-amber text-background' : 'text-muted hover:text-amber'}`}
                  >
                    All
                  </button>
                  {['citadel', 'vallejo', 'army_painter'].map(b => (
                    <button
                      key={b}
                      onClick={() => setSearchBrand(b)}
                      className={`px-2 py-0.5 text-xs rounded transition-colors ${searchBrand === b ? 'bg-amber text-background' : 'text-muted hover:text-amber'}`}
                    >
                      {brandLabel(b)}
                    </button>
                  ))}
                </div>
                {searchResults.length > 0 && (
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {searchResults.map(paint => (
                      <div key={paint.id} className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-background/50 text-sm">
                        <div
                          className="w-6 h-6 rounded border border-card-border flex-shrink-0"
                          style={{ backgroundColor: paint.hex_color || '#ccc' }}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-heading">{paint.name}</span>
                          <span className="text-muted text-xs ml-1.5">{brandLabel(paint.brand)} · {paint.paint_type}</span>
                        </div>
                        <button
                          onClick={() => addPaint(paint.id, 'owned')}
                          disabled={saving}
                          className="px-2 py-0.5 text-xs rounded bg-green-900/30 text-green-400 border border-green-700/50 hover:bg-green-900/50 transition-colors"
                        >
                          + Own
                        </button>
                        <button
                          onClick={() => addPaint(paint.id, 'wishlist')}
                          disabled={saving}
                          className="px-2 py-0.5 text-xs rounded bg-amber/10 text-amber border border-amber-dim/50 hover:bg-amber/20 transition-colors"
                        >
                          + Wish
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {searchQuery.length >= 2 && searchResults.length === 0 && (
                  <p className="text-xs text-muted text-center py-3">No matching paints found</p>
                )}
                {searchQuery.length < 2 && (
                  <p className="text-xs text-muted text-center py-3">Type at least 2 characters to search</p>
                )}
              </div>
            )}
          </div>

          {/* Owned paints grouped by type */}
          {ownedPaints.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted text-sm mb-2">No paints in your collection yet.</p>
              <button
                onClick={() => setShowSearch(true)}
                className="text-amber hover:text-amber-hover text-sm underline underline-offset-2"
              >
                Search and add your first paints
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedTypes.map(type => (
                <div key={type}>
                  <h3 className="text-xs font-semibold text-amber uppercase tracking-wider mb-2">
                    {type} ({ownedByType[type].length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ownedByType[type].map(paint => (
                      <div
                        key={paint.id}
                        className="flex items-center gap-2.5 px-3 py-2 bg-card rounded-md border border-card-border group relative"
                      >
                        <div
                          className="w-7 h-7 rounded-md border-2 border-card-border flex-shrink-0 shadow-sm"
                          style={{ backgroundColor: paint.hex_color || '#ccc' }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-heading truncate">{paint.name}</p>
                          <p className="text-[10px] text-muted">{brandLabel(paint.brand)}</p>
                        </div>
                        <button
                          onClick={() => removePaint(paint.id)}
                          className="absolute top-1 right-1 w-4 h-4 rounded-full bg-deep-red/80 text-white text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove"
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── WISHLIST TAB ── */}
      {tab === 'wishlist' && (
        <div>
          {/* Add to wishlist */}
          <div className="mb-4">
            {!showSearch ? (
              <button
                onClick={() => setShowSearch(true)}
                className="w-full py-2.5 border-2 border-dashed border-card-border rounded-md text-sm text-muted hover:border-amber hover:text-amber transition-colors"
              >
                + Add paints to wishlist
              </button>
            ) : (
              <div className="bg-card rounded-md border border-card-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-heading">Search paint catalog</span>
                  <button onClick={() => { setShowSearch(false); setSearchQuery('') }} className="text-xs text-muted hover:text-foreground">
                    Close
                  </button>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type a paint name..."
                  autoFocus
                  className="w-full rounded-md border border-card-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-amber focus:border-transparent mb-2"
                />
                <div className="flex gap-1.5 mb-3">
                  <button
                    onClick={() => setSearchBrand(null)}
                    className={`px-2 py-0.5 text-xs rounded transition-colors ${!searchBrand ? 'bg-amber text-background' : 'text-muted hover:text-amber'}`}
                  >
                    All
                  </button>
                  {['citadel', 'vallejo', 'army_painter'].map(b => (
                    <button
                      key={b}
                      onClick={() => setSearchBrand(b)}
                      className={`px-2 py-0.5 text-xs rounded transition-colors ${searchBrand === b ? 'bg-amber text-background' : 'text-muted hover:text-amber'}`}
                    >
                      {brandLabel(b)}
                    </button>
                  ))}
                </div>
                {searchResults.length > 0 && (
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {searchResults.map(paint => (
                      <div key={paint.id} className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-background/50 text-sm">
                        <div className="w-6 h-6 rounded border border-card-border flex-shrink-0" style={{ backgroundColor: paint.hex_color || '#ccc' }} />
                        <div className="flex-1 min-w-0">
                          <span className="text-heading">{paint.name}</span>
                          <span className="text-muted text-xs ml-1.5">{brandLabel(paint.brand)}</span>
                        </div>
                        <button onClick={() => addPaint(paint.id, 'wishlist')} disabled={saving} className="px-2 py-0.5 text-xs rounded bg-amber/10 text-amber border border-amber-dim/50 hover:bg-amber/20 transition-colors">
                          + Wishlist
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {searchQuery.length >= 2 && searchResults.length === 0 && (
                  <p className="text-xs text-muted text-center py-3">No matching paints found</p>
                )}
                {searchQuery.length < 2 && (
                  <p className="text-xs text-muted text-center py-3">Type at least 2 characters to search</p>
                )}
              </div>
            )}
          </div>

          {wishlistPaints.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted text-sm">Your wishlist is empty.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {wishlistPaints.map(paint => (
                <div key={paint.id} className="flex items-center gap-3 px-3 py-2.5 bg-card rounded-md border border-card-border text-sm">
                  <div className="w-7 h-7 rounded-md border-2 border-card-border flex-shrink-0 shadow-sm" style={{ backgroundColor: paint.hex_color || '#ccc' }} />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-heading">{paint.name}</span>
                    <span className="text-muted text-xs ml-1.5">{brandLabel(paint.brand)} · {paint.paint_type}</span>
                  </div>
                  <button onClick={() => moveToOwned(paint.id)} disabled={saving} className="px-2 py-0.5 text-xs rounded bg-green-900/30 text-green-400 border border-green-700/50 hover:bg-green-900/50 transition-colors">
                    Got it
                  </button>
                  <button onClick={() => removePaint(paint.id)} disabled={saving} className="px-2 py-0.5 text-xs rounded text-muted hover:text-red-400 transition-colors">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PLANS TAB ── */}
      {tab === 'plans' && (
        <div className="space-y-3">
          {savedPlans.map((plan) => (
            <a
              key={plan.id}
              href={`/plan/${plan.id}`}
              className="block bg-card rounded-md border border-card-border p-4 hover:border-amber/50 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm text-heading group-hover:text-amber transition-colors">
                  {plan.plan_json?.title || plan.input_text}
                </h3>
                <span className="text-muted text-xs group-hover:text-amber transition-colors">&rarr;</span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                <span className="text-amber">{plan.plan_json?.style}</span>
                <span>{plan.plan_json?.paints?.length} paints</span>
                <span>{plan.plan_json?.steps?.length} steps</span>
                <span>{new Date(plan.created_at).toLocaleDateString()}</span>
              </div>
            </a>
          ))}
          {savedPlans.length === 0 && (
            <p className="text-sm text-muted text-center py-8">
              No saved plans yet.{' '}
              <a href="/" className="text-amber hover:text-amber-hover underline underline-offset-2">
                Generate your first plan
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
