import { config } from 'dotenv'
config({ path: '.env.local' })

/**
 * Parse the Arcturus5404/miniature-paints markdown files into JSON
 * and seed the Supabase paint_catalog table.
 *
 * Usage: npx tsx scripts/convert-paints.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

interface Paint {
  name: string
  brand: string
  paint_type: string
  hex_color: string
  color_name: string | null
}

function parseCitadel(filepath: string): Paint[] {
  const raw = readFileSync(filepath, 'utf-8')
  const lines = raw.split('\n').filter(l => l.startsWith('|') && !l.startsWith('|Name') && !l.startsWith('|---'))
  const paints: Paint[] = []

  for (const line of lines) {
    const cols = line.split('|').map(c => c.trim()).filter(Boolean)
    // Format: Name | Set | R | G | B | Hex (with markdown image)
    if (cols.length < 6) continue
    const name = cols[0]
    const set = cols[1]
    const hex = cols[5].match(/#[0-9A-Fa-f]{6}/)?.[0]
    if (!name || !hex) continue

    // Skip discontinued and non-paint entries
    if (set.includes('discontinued')) continue
    if (['Technical', 'Shade', 'Glaze'].includes(set) && name.includes('Thinner')) continue

    paints.push({
      name,
      brand: 'citadel',
      paint_type: normalizePaintType(set),
      hex_color: hex,
      color_name: null,
    })
  }

  return dedup(paints)
}

function parseVallejo(filepath: string): Paint[] {
  const raw = readFileSync(filepath, 'utf-8')
  const lines = raw.split('\n').filter(l => l.startsWith('|') && !l.startsWith('|Name') && !l.startsWith('|---'))
  const paints: Paint[] = []

  // Detect which section we're in by tracking headers
  let currentSet = 'Model Color'
  const sections = raw.split('\n')
  const sectionHeaders: { line: number; name: string }[] = []
  sections.forEach((l, i) => {
    if (l.startsWith('## ')) sectionHeaders.push({ line: i, name: l.replace('## ', '').trim() })
  })

  for (const line of lines) {
    const cols = line.split('|').map(c => c.trim()).filter(Boolean)
    // Vallejo format varies: Name | Code | Set | R | G | B | Hex  OR  Name | Set | R | G | B | Hex
    if (cols.length < 5) continue

    let name: string, set: string, hex: string | undefined

    // Try to find hex in the columns
    const hexCol = cols.findIndex(c => c.includes('#'))
    if (hexCol === -1) continue

    hex = cols[hexCol].match(/#[0-9A-Fa-f]{6}/)?.[0]
    if (!hex) continue

    // Name is always first column
    name = cols[0]

    // Set is the column after name (or after code if code column exists)
    if (cols.length >= 7) {
      // Has Code column: Name | Code | Set | R | G | B | Hex
      set = cols[2]
    } else {
      // No code: Name | Set | R | G | B | Hex
      set = cols[1]
    }

    if (!name || name === 'Name') continue

    paints.push({
      name,
      brand: 'vallejo',
      paint_type: normalizePaintType(set),
      hex_color: hex,
      color_name: null,
    })
  }

  return dedup(paints)
}

function parseArmyPainter(filepath: string): Paint[] {
  const raw = readFileSync(filepath, 'utf-8')
  const lines = raw.split('\n').filter(l => l.startsWith('|') && !l.startsWith('|Name') && !l.startsWith('|---'))
  const paints: Paint[] = []

  for (const line of lines) {
    const cols = line.split('|').map(c => c.trim()).filter(Boolean)
    // Format: Name | Code | Set | R | G | B | Hex
    if (cols.length < 7) continue

    const name = cols[0]
    const set = cols[2]
    const hex = cols[6].match(/#[0-9A-Fa-f]{6}/)?.[0]
    if (!name || !hex || name === 'Name') continue

    // Skip primers and varnishes
    if (set.includes('Primer') || set.includes('Varnish')) continue

    paints.push({
      name,
      brand: 'army_painter',
      paint_type: normalizePaintType(set),
      hex_color: hex,
      color_name: null,
    })
  }

  return dedup(paints)
}

function normalizePaintType(set: string): string {
  const s = set.toLowerCase().trim()
  if (s.includes('base') || s.includes('foundation')) return 'base'
  if (s.includes('layer')) return 'layer'
  if (s.includes('shade') || s.includes('wash') || s.includes('tone') || s.includes('ink')) return 'shade'
  if (s.includes('contrast') || s.includes('speed')) return 'contrast'
  if (s.includes('dry')) return 'dry'
  if (s.includes('technical') || s.includes('texture')) return 'technical'
  if (s.includes('spray') || s.includes('primer') || s.includes('rattlecan')) return 'spray'
  if (s.includes('air')) return 'air'
  if (s.includes('metallic') || s.includes('metal')) return 'metallic'
  if (s.includes('model color') || s.includes('model colour')) return 'base'
  if (s.includes('game color') || s.includes('game colour')) return 'base'
  if (s.includes('warpaint') || s.includes('fanatic')) return 'base'
  return 'base' // default
}

function dedup(paints: Paint[]): Paint[] {
  const seen = new Set<string>()
  return paints.filter(p => {
    const key = `${p.name.toLowerCase()}|${p.brand}|${p.paint_type}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function seed(paints: Paint[]) {
  console.log(`\nSeeding ${paints.length} paints...`)

  // Clear existing catalog
  console.log('Clearing existing paint_catalog...')
  await supabase.from('paint_catalog').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  // Insert in batches
  const batchSize = 100
  let inserted = 0

  for (let i = 0; i < paints.length; i += batchSize) {
    const batch = paints.slice(i, i + batchSize)
    const { error } = await supabase.from('paint_catalog').insert(
      batch.map(p => ({
        name: p.name,
        brand: p.brand,
        paint_type: p.paint_type,
        hex_color: p.hex_color,
        color_name: p.color_name,
      }))
    )

    if (error) {
      console.error(`Error at batch ${Math.floor(i / batchSize) + 1}:`, error.message)
      process.exit(1)
    }

    inserted += batch.length
    process.stdout.write(`  ${inserted}/${paints.length}\r`)
  }

  console.log(`  ${inserted}/${paints.length} — done!`)
}

async function main() {
  const basePath = '/tmp/miniature-paints/paints'

  console.log('Parsing Citadel Colour...')
  const citadel = parseCitadel(`${basePath}/Citadel_Colour.md`)
  console.log(`  ${citadel.length} paints`)

  console.log('Parsing Vallejo...')
  const vallejo = parseVallejo(`${basePath}/Vallejo.md`)
  console.log(`  ${vallejo.length} paints`)

  console.log('Parsing Army Painter...')
  const armyPainter = parseArmyPainter(`${basePath}/Army_Painter.md`)
  console.log(`  ${armyPainter.length} paints`)

  const all = [...citadel, ...vallejo, ...armyPainter]
  console.log(`\nTotal: ${all.length} paints across 3 brands`)

  await seed(all)

  // Print summary by brand and type
  const summary: Record<string, Record<string, number>> = {}
  for (const p of all) {
    if (!summary[p.brand]) summary[p.brand] = {}
    summary[p.brand][p.paint_type] = (summary[p.brand][p.paint_type] || 0) + 1
  }
  console.log('\nSummary:')
  for (const [brand, types] of Object.entries(summary)) {
    const total = Object.values(types).reduce((a, b) => a + b, 0)
    console.log(`  ${brand}: ${total} paints (${Object.entries(types).map(([t, c]) => `${t}:${c}`).join(', ')})`)
  }
}

main().catch(err => {
  console.error('Failed:', err)
  process.exit(1)
})
