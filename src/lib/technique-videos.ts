/**
 * Curated YouTube video mapping for miniature painting techniques.
 *
 * Each entry maps a technique/phase to a YouTube video ID and metadata.
 * When no curated video matches, we fall back to a YouTube search URL.
 *
 * Video IDs sourced from popular miniature painting channels:
 * - Warhammer (official GW channel)
 * - Duncan Rhodes Painting Academy
 * - Squidmar Miniatures
 * - Miniac
 * - Ninjon
 */

interface TechniqueVideo {
  videoId: string
  title: string
  channel: string
}

// Curated videos for common techniques and phases
const TECHNIQUE_VIDEOS: Record<string, TechniqueVideo> = {
  // Preparation / Priming
  prime: {
    videoId: 'aUm5SyCaILg',
    title: 'How to Prime Miniatures',
    channel: 'Warhammer',
  },
  priming: {
    videoId: 'aUm5SyCaILg',
    title: 'How to Prime Miniatures',
    channel: 'Warhammer',
  },
  assembly: {
    videoId: 'V2EBSwiaH6U',
    title: 'How to Build Your First Miniatures',
    channel: 'Warhammer',
  },

  // Basecoating
  basecoat: {
    videoId: 'yZvX7xDGBLg',
    title: 'How to Base Coat Miniatures',
    channel: 'Warhammer',
  },
  'base coat': {
    videoId: 'yZvX7xDGBLg',
    title: 'How to Base Coat Miniatures',
    channel: 'Warhammer',
  },
  'two thin coats': {
    videoId: 'wxWgsqSf74s',
    title: 'How to Thin Your Paints',
    channel: 'Warhammer',
  },

  // Washes and shading
  wash: {
    videoId: 'tUQsiv41Enw',
    title: 'How to Use Shade Paints',
    channel: 'Warhammer',
  },
  shade: {
    videoId: 'tUQsiv41Enw',
    title: 'How to Use Shade Paints',
    channel: 'Warhammer',
  },
  'nuln oil': {
    videoId: 'tUQsiv41Enw',
    title: 'How to Use Shade Paints',
    channel: 'Warhammer',
  },

  // Drybrushing
  drybrush: {
    videoId: 'MK2MFGwV9rU',
    title: 'How to Drybrush Miniatures',
    channel: 'Warhammer',
  },
  drybrushing: {
    videoId: 'MK2MFGwV9rU',
    title: 'How to Drybrush Miniatures',
    channel: 'Warhammer',
  },

  // Edge highlighting
  'edge highlight': {
    videoId: '-MNtYMGV-3I',
    title: 'How to Edge Highlight',
    channel: 'Warhammer',
  },
  highlight: {
    videoId: '-MNtYMGV-3I',
    title: 'How to Edge Highlight',
    channel: 'Warhammer',
  },

  // Layering
  layer: {
    videoId: 'ht_csdSFzNM',
    title: 'How to Layer Paints on Miniatures',
    channel: 'Warhammer',
  },
  layering: {
    videoId: 'ht_csdSFzNM',
    title: 'How to Layer Paints on Miniatures',
    channel: 'Warhammer',
  },

  // Contrast paints
  contrast: {
    videoId: 'PuMPYFaI2Xo',
    title: 'How to Use Contrast Paints',
    channel: 'Warhammer',
  },

  // Wet blending
  'wet blend': {
    videoId: 'ERX3ghWvMDw',
    title: 'Wet Blending for Miniature Painting',
    channel: 'Miniac',
  },
  wetblend: {
    videoId: 'ERX3ghWvMDw',
    title: 'Wet Blending for Miniature Painting',
    channel: 'Miniac',
  },

  // Glazing
  glaze: {
    videoId: 'K3MbsdbZHAE',
    title: 'How to Glaze Miniatures',
    channel: 'Duncan Rhodes Painting Academy',
  },
  glazing: {
    videoId: 'K3MbsdbZHAE',
    title: 'How to Glaze Miniatures',
    channel: 'Duncan Rhodes Painting Academy',
  },

  // Basing
  basing: {
    videoId: 'Ij6MmFNJVJk',
    title: 'How to Base Your Miniatures',
    channel: 'Warhammer',
  },
  'texture paint': {
    videoId: 'Ij6MmFNJVJk',
    title: 'How to Base Your Miniatures',
    channel: 'Warhammer',
  },

  // Stippling
  stipple: {
    videoId: '1dO3UZMaFUY',
    title: 'Stippling Technique for Miniatures',
    channel: 'Squidmar Miniatures',
  },
  stippling: {
    videoId: '1dO3UZMaFUY',
    title: 'Stippling Technique for Miniatures',
    channel: 'Squidmar Miniatures',
  },

  // Weathering
  weathering: {
    videoId: 'PlwDV3VCiME',
    title: 'Weathering Miniatures for Beginners',
    channel: 'Ninjon',
  },

  // NMM (Non-Metallic Metal)
  nmm: {
    videoId: 'CHHoC2Dsow4',
    title: 'NMM Gold Tutorial',
    channel: 'Squidmar Miniatures',
  },
  'non-metallic metal': {
    videoId: 'CHHoC2Dsow4',
    title: 'NMM Gold Tutorial',
    channel: 'Squidmar Miniatures',
  },

  // Varnishing
  varnish: {
    videoId: 'dXbj7TjWiIo',
    title: 'How to Varnish Miniatures',
    channel: 'Miniac',
  },
}

// Phase label → technique mapping
const PHASE_TECHNIQUE_MAP: Record<string, string> = {
  'Preparation': 'prime',
  'Base Colors': 'basecoat',
  'Shading & Washes': 'wash',
  'Highlights & Details': 'edge highlight',
  'Finishing': 'varnish',
}

/**
 * Find a curated video for a technique keyword.
 */
export function findVideoForTechnique(technique: string): TechniqueVideo | null {
  const key = technique.toLowerCase().trim()
  return TECHNIQUE_VIDEOS[key] || null
}

/**
 * Find a video for a plan phase label.
 */
export function findVideoForPhase(phaseLabel: string): TechniqueVideo | null {
  const technique = PHASE_TECHNIQUE_MAP[phaseLabel]
  if (technique) return findVideoForTechnique(technique)

  // Try matching the phase label directly
  return findVideoForTechnique(phaseLabel)
}

/**
 * Find a video for a step's technique field.
 * Tries exact match first, then keyword extraction.
 */
export function findVideoForStep(technique: string, instruction: string): TechniqueVideo | null {
  // Try exact technique match
  const direct = findVideoForTechnique(technique)
  if (direct) return direct

  // Try keywords from instruction
  const text = `${technique} ${instruction}`.toLowerCase()
  const keywords = Object.keys(TECHNIQUE_VIDEOS)
  for (const kw of keywords) {
    if (text.includes(kw)) {
      return TECHNIQUE_VIDEOS[kw]
    }
  }

  return null
}

/**
 * Generate a YouTube search URL as fallback.
 */
export function youtubeSearchUrl(technique: string): string {
  const query = encodeURIComponent(`miniature painting ${technique} tutorial`)
  return `https://www.youtube.com/results?search_query=${query}`
}

/**
 * YouTube embed URL for a video ID.
 */
export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`
}
