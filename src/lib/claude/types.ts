export interface SessionPlan {
  title: string
  style: string
  estimated_time_min: number
  paints: PaintItem[]
  steps: PaintStep[]
  basing: BasingStep[]
  references?: PlanReferences
}

export interface PaintItem {
  name: string
  brand: string
  paint_type: string
  hex_color?: string
  purpose: string
}

export interface PaintStep {
  order: number
  instruction: string
  paint_name: string | null
  technique: string
}

export interface BasingStep {
  order: number
  instruction: string
  materials: string[]
}

export interface PlanReferences {
  search_query: string
  faction?: string
  unit?: string
  color_scheme_description: string
  suggested_sources: string[]
}
