import { SupabaseClient } from '@supabase/supabase-js'

const SOFT_LIMIT = 5
const HARD_LIMIT = 10

export type UsageStatus = 'ok' | 'nag' | 'blocked'

export interface UsageInfo {
  plan_count: number
  status: UsageStatus
  limit: number
  remaining: number
}

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7) // '2026-04'
}

/**
 * Check user's plan usage for the current month.
 * Returns status: ok (under 5), nag (5-9), blocked (10+)
 */
export async function checkUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<UsageInfo> {
  const month = getCurrentMonth()

  const { data } = await supabase
    .from('usage_tracking')
    .select('plan_count')
    .eq('user_id', userId)
    .eq('month', month)
    .single()

  const planCount = data?.plan_count ?? 0

  let status: UsageStatus = 'ok'
  if (planCount >= HARD_LIMIT) {
    status = 'blocked'
  } else if (planCount >= SOFT_LIMIT) {
    status = 'nag'
  }

  return {
    plan_count: planCount,
    status,
    limit: HARD_LIMIT,
    remaining: Math.max(0, HARD_LIMIT - planCount),
  }
}

/**
 * Increment plan usage for the current month.
 * Creates the row if it doesn't exist (upsert).
 */
export async function incrementUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const month = getCurrentMonth()

  // Try to increment existing row
  const { data: existing } = await supabase
    .from('usage_tracking')
    .select('id, plan_count')
    .eq('user_id', userId)
    .eq('month', month)
    .single()

  if (existing) {
    await supabase
      .from('usage_tracking')
      .update({ plan_count: existing.plan_count + 1 })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('usage_tracking')
      .insert({ user_id: userId, month, plan_count: 1 })
  }
}
