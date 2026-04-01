import { generatePlan } from '@/lib/claude/generate-plan'
import { createClient } from '@/lib/supabase/server'
import { incrementUsage } from '@/lib/usage'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Usage check
    const currentMonth = new Date().toISOString().slice(0, 7)
    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('plan_count')
      .eq('user_id', user.id)
      .eq('month', currentMonth)
      .single()

    const planCount = usage?.plan_count ?? 0
    if (planCount >= 10) {
      return Response.json(
        { error: 'Monthly plan limit reached', plan_count: planCount, limit: 10 },
        { status: 429 }
      )
    }

    // Parse request
    const body = await request.json()
    const { description, imageBase64, imageMimeType, includeBasing = true } = body

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return Response.json({ error: 'Description is required' }, { status: 400 })
    }

    // Get user's paint inventory for context
    const { data: inventory } = await supabase
      .from('user_inventory')
      .select('paint_id, paint_catalog(name)')
      .eq('user_id', user.id)
      .eq('status', 'owned')

    const userPaints = inventory
      ?.map((item: any) => item.paint_catalog?.name)
      .filter(Boolean) as string[] | undefined

    // Generate plan via Claude
    let plan
    try {
      plan = await generatePlan({
        description: description.trim(),
        imageBase64,
        imageMimeType,
        includeBasing,
        userPaints,
      })
    } catch (err: any) {
      if (err?.status === 429) {
        const retryAfter = err?.headers?.['retry-after'] || '60'
        return Response.json(
          { error: `AI is busy. Try again in ${retryAfter} seconds.`, retry_after: parseInt(retryAfter) },
          { status: 429 }
        )
      }
      console.error('Claude API error:', err)
      return Response.json(
        { error: 'Plan generation failed. Please try again in a few minutes.' },
        { status: 502 }
      )
    }

    // Save to database
    let planId: string | null = null
    let saveError: string | null = null

    const { data: savedPlan, error: dbError } = await supabase
      .from('session_plans')
      .insert({
        user_id: user.id,
        input_text: description.trim(),
        input_image_url: null,
        plan_json: plan as any,
      })
      .select('id')
      .single()

    if (dbError) {
      console.error('Save error:', dbError)
      saveError = 'Failed to save plan. You can still view it below.'
    } else {
      planId = savedPlan.id
    }

    // Increment usage (non-blocking)
    incrementUsage(supabase, user.id).catch((err) =>
      console.error('Usage tracking error:', err)
    )

    return Response.json({
      plan,
      plan_id: planId,
      save_error: saveError,
      usage: { plan_count: planCount + 1, limit: 10 },
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
