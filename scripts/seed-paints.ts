import { config } from 'dotenv'
config({ path: '.env.local' })

/**
 * Seed the paint_catalog table with Citadel paints.
 *
 * Usage:
 *   npx tsx scripts/seed-paints.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 * (service role key bypasses RLS — needed for seeding)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error(
    'Missing env vars. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local'
  )
  console.error(
    'Find your service role key at: Supabase Dashboard > Settings > API > service_role (secret)'
  )
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

interface PaintEntry {
  name: string
  brand: string
  paint_type: string
  hex_color: string
  color_name: string
}

async function seed() {
  const filePath = join(__dirname, '..', 'src', 'data', 'citadel-paints.json')
  const raw = readFileSync(filePath, 'utf-8')
  const paints: PaintEntry[] = JSON.parse(raw)

  console.log(`Found ${paints.length} paints to seed...`)

  // Check if already seeded
  const { count } = await supabase
    .from('paint_catalog')
    .select('*', { count: 'exact', head: true })

  if (count && count > 0) {
    console.log(`paint_catalog already has ${count} rows. Skipping seed.`)
    console.log('To re-seed, run: DELETE FROM paint_catalog; in the SQL editor first.')
    return
  }

  // Insert in batches of 50
  const batchSize = 50
  let inserted = 0

  for (let i = 0; i < paints.length; i += batchSize) {
    const batch = paints.slice(i, i + batchSize)
    const { error } = await supabase.from('paint_catalog').insert(
      batch.map((p) => ({
        name: p.name,
        brand: p.brand,
        paint_type: p.paint_type,
        hex_color: p.hex_color,
        color_name: p.color_name,
      }))
    )

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error.message)
      process.exit(1)
    }

    inserted += batch.length
    console.log(`  Inserted ${inserted}/${paints.length}`)
  }

  console.log(`Done! ${inserted} paints seeded.`)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
