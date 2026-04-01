import Anthropic from '@anthropic-ai/sdk'
import type { SessionPlan } from './types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const SESSION_PLAN_TOOL: Anthropic.Messages.Tool = {
  name: 'create_session_plan',
  description: 'Create a structured painting session plan for a miniature painter',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string',
        description: 'Short title, e.g. "Blood Angels Intercessor - Grimdark"',
      },
      style: {
        type: 'string',
        description: 'Painting style: grimdark, box art, tabletop-ready, speed paint, contrast-only, parade/display',
      },
      estimated_time_min: {
        type: 'number',
        description: 'Estimated painting time in minutes for a hobbyist',
      },
      paints: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Exact paint name, e.g. "Mephiston Red"' },
            brand: { type: 'string', description: 'citadel, vallejo, or army_painter' },
            paint_type: { type: 'string', description: 'base, layer, shade, contrast, technical, dry, spray, air' },
            hex_color: { type: 'string', description: 'Hex color, e.g. "#9A1115"' },
            purpose: { type: 'string', description: 'What this paint does in this plan, e.g. "base coat armor"' },
          },
          required: ['name', 'brand', 'paint_type', 'purpose'],
        },
      },
      steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            order: { type: 'number' },
            instruction: { type: 'string', description: 'Clear, specific instruction' },
            paint_name: { type: 'string', description: 'Paint used in this step, or null' },
            technique: { type: 'string', description: 'basecoat, layer, wash, drybrush, edge highlight, glaze, wetblend, stipple' },
          },
          required: ['order', 'instruction', 'technique'],
        },
      },
      basing: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            order: { type: 'number' },
            instruction: { type: 'string' },
            materials: { type: 'array', items: { type: 'string' } },
          },
          required: ['order', 'instruction', 'materials'],
        },
      },
    },
    required: ['title', 'style', 'estimated_time_min', 'paints', 'steps', 'basing'],
  },
}

const SYSTEM_PROMPT = `You are MiniMastery, an expert miniature painting advisor. You create detailed, step-by-step painting session plans.

Your expertise:
- Citadel, Vallejo, Army Painter paint ranges (use REAL paint names only)
- Warhammer 40K, Age of Sigmar, and tabletop game faction colors and lore
- Techniques: basecoating, layering, washing, drybrushing, edge highlighting, wet blending, glazing, stippling, contrast painting
- Basing: texture paints, sand, tufts, cork, rocks, water effects
- Color theory for miniature painting

Rules:
- Use REAL paint names from major brands (default to Citadel)
- Include hex colors for every paint
- Steps must be specific: "Apply two thin coats of Mephiston Red to all armor panels" not "paint the red parts"
- Always include basing unless told not to
- Realistic time estimates for a hobbyist (not speed painter, not display painter)
- Adjust for style:
  - Grimdark: heavy washes, weathering, muted highlights
  - Box art: clean basecoats, precise edge highlights, official GW scheme
  - Tabletop-ready: quick techniques, looks good from 3 feet
  - Speed paint: contrast paints, minimal steps
  - Parade/display: multiple thin layers, wet blending, NMM, max detail
- Aim for 8-15 steps (more for display, fewer for speed paint)
- Each paint needs a clear purpose`

export interface GeneratePlanInput {
  description: string
  imageBase64?: string
  imageMimeType?: string
  includeBasing: boolean
  userPaints?: string[]
}

export async function generatePlan(input: GeneratePlanInput): Promise<SessionPlan> {
  const contentBlocks: Anthropic.Messages.ContentBlockParam[] = []

  if (input.imageBase64 && input.imageMimeType) {
    contentBlocks.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: input.imageMimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
        data: input.imageBase64,
      },
    })
  }

  let textPrompt = `Create a painting session plan for: ${input.description}`

  if (!input.includeBasing) {
    textPrompt += '\n\nDo NOT include basing steps. Return an empty basing array.'
  }

  if (input.userPaints && input.userPaints.length > 0) {
    textPrompt += `\n\nThe painter owns these paints: ${input.userPaints.join(', ')}. Prefer paints from this list when possible. Still include paints they don't own if needed.`
  }

  if (input.imageBase64) {
    textPrompt += '\n\nAnalyze the reference image to identify the color scheme, style, and techniques. Generate a plan to recreate this look.'
  }

  contentBlocks.push({ type: 'text', text: textPrompt })

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [SESSION_PLAN_TOOL],
    tool_choice: { type: 'tool', name: 'create_session_plan' },
    messages: [{ role: 'user', content: contentBlocks }],
  })

  for (const block of response.content) {
    if (block.type === 'tool_use' && block.name === 'create_session_plan') {
      return block.input as unknown as SessionPlan
    }
  }

  throw new Error('Claude did not return a structured plan')
}
