'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { PlanDisplay } from '@/components/plan-display'

export default function Home() {
  const [description, setDescription] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imageMimeType, setImageMimeType] = useState<string | null>(null)
  const [includeBasing, setIncludeBasing] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [plan, setPlan] = useState<any>(null)
  const [planId, setPlanId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [ownedPaintNames, setOwnedPaintNames] = useState<string[]>([])
  const [loadingStep, setLoadingStep] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const supabase = createClient()

  // Check session + load owned paints on mount
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email ?? null)
        const { data: inventory } = await supabase
          .from('user_inventory')
          .select('paint_catalog(name)')
          .eq('user_id', user.id)
          .eq('status', 'owned')
        if (inventory) {
          setOwnedPaintNames(
            inventory.map((i: any) => i.paint_catalog?.name).filter(Boolean)
          )
        }
      }
    })
  }, [])

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB')
      return
    }

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setError('Image must be JPEG, PNG, WebP, or GIF')
      return
    }

    setError(null)
    setImageMimeType(file.type)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setImagePreview(dataUrl)
      setImageBase64(dataUrl.split(',')[1])
    }
    reader.readAsDataURL(file)
  }

  function removeImage() {
    setImagePreview(null)
    setImageBase64(null)
    setImageMimeType(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleGenerate() {
    if (!description.trim()) {
      setError('Describe what you want to paint')
      return
    }

    // Check auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    setIsGenerating(true)
    setError(null)
    setPlan(null)
    setPlanId(null)
    setSaveError(null)
    setLoadingStep(0)

    try {
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          imageBase64,
          imageMimeType,
          includeBasing,
        }),
      })

      if (res.status === 401) {
        router.push('/auth/login')
        return
      }

      if (res.status === 429) {
        const data = await res.json()
        setError(`Monthly plan limit reached (${data.plan_count}/${data.limit}). Upgrade for unlimited plans.`)
        setIsGenerating(false)
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Something went wrong. Try again.')
        setIsGenerating(false)
        return
      }

      const data = await res.json()
      setPlan(data.plan)
      setPlanId(data.plan_id)
      if (data.save_error) setSaveError(data.save_error)
    } catch (err) {
      setError('Network error. Check your connection and try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2 text-heading">
          Know exactly what you need before you sit down to paint.
        </h1>
        <p className="text-muted">
          Describe your miniature, get a complete session plan with paints, steps, and basing.
        </p>
      </div>

      {/* Input form */}
      <div className="bg-card rounded-lg border border-card-border p-6 mb-6">
        {/* Description */}
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
            What are you painting?
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder='e.g., "Blood Angels Intercessor, grimdark style" or "Stormcast Eternal with a desert base"'
            className="w-full rounded-md border border-card-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-amber focus:border-transparent resize-none"
            rows={3}
            maxLength={1000}
          />
          <div className="text-xs text-muted mt-1 text-right">
            {description.length}/1000
          </div>
        </div>

        {/* Image upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-1">
            Reference image (optional)
          </label>
          {imagePreview ? (
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Reference"
                className="h-32 w-32 object-cover rounded-md border border-card-border"
              />
              <button
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-deep-red text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-700"
              >
                x
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-card-border rounded-md py-6 text-center text-sm text-muted hover:border-amber hover:text-amber transition-colors"
            >
              Drop a reference image here or click to upload
              <br />
              <span className="text-xs opacity-60">JPEG, PNG, WebP, or GIF under 10MB</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {/* Basing toggle */}
        <div className="mb-6 flex items-center gap-2">
          <label className="text-sm font-medium text-foreground">Include basing?</label>
          <div className="flex gap-1">
            <button
              onClick={() => setIncludeBasing(true)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                includeBasing
                  ? 'bg-amber text-background border-amber font-semibold'
                  : 'border-card-border text-muted hover:border-amber hover:text-amber'
              }`}
            >
              Yes
            </button>
            <button
              onClick={() => setIncludeBasing(false)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                !includeBasing
                  ? 'bg-amber text-background border-amber font-semibold'
                  : 'border-card-border text-muted hover:border-amber hover:text-amber'
              }`}
            >
              No
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-deep-red/20 border border-deep-red rounded-md text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !description.trim()}
          className="w-full py-3.5 bg-gradient-to-b from-amber to-amber-dim text-background font-bold rounded-md hover:from-amber-hover hover:to-amber disabled:opacity-40 disabled:cursor-not-allowed transition-all text-base tracking-wide shadow-lg shadow-amber/20"
        >
          {isGenerating ? 'Generating...' : 'Generate Session Plan'}
        </button>
      </div>

      {/* Loading indicator — themed steps */}
      {isGenerating && !plan && (
        <LoadingSteps step={loadingStep} onAdvance={() => setLoadingStep(s => s + 1)} />
      )}

      {/* Plan display */}
      {plan && (
        <PlanDisplay
          plan={plan}
          planId={planId}
          saveError={saveError}
          ownedPaintNames={ownedPaintNames}
        />
      )}
    </div>
  )
}

const LOADING_MESSAGES = [
  { text: 'Sorting through the paint rack...', icon: '🎨' },
  { text: 'Searching for references...', icon: '🔍' },
  { text: 'Checking color theory...', icon: '🌈' },
  { text: 'Thinning the paints (two thin coats!)...', icon: '💧' },
  { text: 'Looking up lore-accurate schemes...', icon: '📖' },
  { text: 'Planning the basing materials...', icon: '🪨' },
  { text: 'Laying out the steps...', icon: '📋' },
  { text: 'Almost done, final highlights...', icon: '✨' },
]

function LoadingSteps({ step, onAdvance }: { step: number; onAdvance: () => void }) {
  useEffect(() => {
    const interval = setInterval(onAdvance, 2200)
    return () => clearInterval(interval)
  }, [onAdvance])

  const visibleMessages = LOADING_MESSAGES.slice(0, Math.min(step + 1, LOADING_MESSAGES.length))

  return (
    <div className="bg-card rounded-lg border border-card-border p-5">
      <div className="space-y-2.5">
        {visibleMessages.map((msg, i) => {
          const isLatest = i === visibleMessages.length - 1
          return (
            <div
              key={i}
              className={`flex items-center gap-3 transition-opacity duration-500 ${
                isLatest ? 'opacity-100' : 'opacity-40'
              }`}
            >
              <span className="text-base w-6 text-center flex-shrink-0">{msg.icon}</span>
              <span className={`text-sm ${isLatest ? 'text-foreground' : 'text-muted'}`}>
                {msg.text}
              </span>
              {isLatest && (
                <div className="w-1.5 h-1.5 bg-amber rounded-full animate-pulse ml-1" />
              )}
              {!isLatest && (
                <span className="text-green-500 text-xs ml-1">done</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
