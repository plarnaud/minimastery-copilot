import type { PaintItem } from '@/lib/claude/types'

export type InventoryStatus = 'have' | 'missing' | 'substitute' | 'approximate'

export interface PaintWithStatus extends PaintItem {
  status: InventoryStatus
  substitute_name?: string
  substitute_brand?: string
  shopping_url?: string
}

// Tier 1: Exact cross-brand equivalents (curated)
// Key: lowercase paint name, Value: { name, brand }
const CROSS_BRAND_EQUIVALENTS: Record<string, { name: string; brand: string }[]> = {
  'abaddon black': [{ name: 'Black', brand: 'vallejo' }, { name: 'Matt Black', brand: 'army_painter' }],
  'mephiston red': [{ name: 'Bloody Red', brand: 'vallejo' }, { name: 'Pure Red', brand: 'army_painter' }],
  'macragge blue': [{ name: 'Ultramarine Blue', brand: 'vallejo' }, { name: 'Crystal Blue', brand: 'army_painter' }],
  'retributor armour': [{ name: 'Glorious Gold', brand: 'vallejo' }, { name: 'Weapon Bronze', brand: 'army_painter' }],
  'nuln oil': [{ name: 'Black Wash', brand: 'vallejo' }, { name: 'Dark Tone Ink', brand: 'army_painter' }],
  'agrax earthshade': [{ name: 'Sepia Wash', brand: 'vallejo' }, { name: 'Strong Tone Ink', brand: 'army_painter' }],
  'leadbelcher': [{ name: 'Gunmetal', brand: 'vallejo' }, { name: 'Gun Metal', brand: 'army_painter' }],
  'corax white': [{ name: 'Dead White', brand: 'vallejo' }, { name: 'Matt White', brand: 'army_painter' }],
  'wraithbone': [{ name: 'Bonewhite', brand: 'vallejo' }, { name: 'Skeleton Bone', brand: 'army_painter' }],
  'khorne red': [{ name: 'Scarlett Red', brand: 'vallejo' }, { name: 'Dragon Red', brand: 'army_painter' }],
  'caliban green': [{ name: 'Dark Green', brand: 'vallejo' }, { name: 'Angel Green', brand: 'army_painter' }],
  'averland sunset': [{ name: 'Gold Yellow', brand: 'vallejo' }, { name: 'Daemonic Yellow', brand: 'army_painter' }],
  'mechanicus standard grey': [{ name: 'Neutral Grey', brand: 'vallejo' }, { name: 'Uniform Grey', brand: 'army_painter' }],
  'dawnstone': [{ name: 'Stonewall Grey', brand: 'vallejo' }, { name: 'Ash Grey', brand: 'army_painter' }],
  'ushabti bone': [{ name: 'Bonewhite', brand: 'vallejo' }, { name: 'Skeleton Bone', brand: 'army_painter' }],
  'zandri dust': [{ name: 'Dark Sand', brand: 'vallejo' }, { name: 'Arid Earth', brand: 'army_painter' }],
  'rhinox hide': [{ name: 'Chocolate Brown', brand: 'vallejo' }, { name: 'Oak Brown', brand: 'army_painter' }],
  'celestra grey': [{ name: 'Wolf Grey', brand: 'vallejo' }],
  'rakarth flesh': [{ name: 'Pale Sand', brand: 'vallejo' }],
  'screamer pink': [{ name: 'Warlord Purple', brand: 'vallejo' }],
  'kantor blue': [{ name: 'Stormy Blue', brand: 'vallejo' }],
  'bugmans glow': [{ name: 'Dwarf Skin', brand: 'vallejo' }],
  'iron hands steel': [{ name: 'Natural Steel', brand: 'vallejo' }],
  'naggaroth night': [{ name: 'Royal Purple', brand: 'vallejo' }],
  'thousand sons blue': [{ name: 'Blue-Green', brand: 'vallejo' }],
}

function normalizePaintName(name: string): string {
  return name.toLowerCase().replace(/['']/g, '').trim()
}

function generateShoppingUrl(paintName: string, brand: string): string {
  const query = encodeURIComponent(`${brand} ${paintName} paint`)
  return `https://www.amazon.com/s?k=${query}`
}

/**
 * Find Tier 1 cross-brand substitute for a paint
 */
function findTier1Substitute(
  paintName: string,
  userPaintNames: Set<string>
): { name: string; brand: string } | null {
  const normalized = normalizePaintName(paintName)
  const equivalents = CROSS_BRAND_EQUIVALENTS[normalized]

  if (!equivalents) return null

  for (const equiv of equivalents) {
    if (userPaintNames.has(normalizePaintName(equiv.name))) {
      return equiv
    }
  }

  return null
}

/**
 * Diff plan paints against user inventory.
 *
 * Returns each paint with a status:
 * - 'have': user owns this exact paint
 * - 'substitute': Tier 1 cross-brand equivalent found in user's collection
 * - 'missing': user doesn't own it and no substitute found
 *
 * When no inventory is provided, all paints get 'missing' status
 * but no shopping links (user hasn't registered their paints yet).
 */
export function diffInventory(
  planPaints: PaintItem[],
  userPaintNames: string[]
): PaintWithStatus[] {
  const normalizedUserPaints = new Set(
    userPaintNames.map(normalizePaintName)
  )

  const hasInventory = userPaintNames.length > 0

  return planPaints.map((paint) => {
    const normalizedName = normalizePaintName(paint.name)

    // Check if user owns this exact paint
    if (normalizedUserPaints.has(normalizedName)) {
      return { ...paint, status: 'have' as const }
    }

    // Check for Tier 1 cross-brand substitute
    if (hasInventory) {
      const substitute = findTier1Substitute(paint.name, normalizedUserPaints)
      if (substitute) {
        return {
          ...paint,
          status: 'substitute' as const,
          substitute_name: substitute.name,
          substitute_brand: substitute.brand,
        }
      }
    }

    // Missing — include shopping link
    return {
      ...paint,
      status: 'missing' as const,
      shopping_url: generateShoppingUrl(paint.name, paint.brand),
    }
  })
}

/**
 * Summary stats for the inventory diff
 */
export function diffSummary(paints: PaintWithStatus[]) {
  const have = paints.filter((p) => p.status === 'have').length
  const missing = paints.filter((p) => p.status === 'missing').length
  const substitute = paints.filter((p) => p.status === 'substitute').length
  const approximate = paints.filter((p) => p.status === 'approximate').length

  return { have, missing, substitute, approximate, total: paints.length }
}
