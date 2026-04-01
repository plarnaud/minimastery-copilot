'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const supabase = createClient()

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
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Know exactly what you need before you sit down to paint.
        </h1>
        <p className="text-stone-500">
          Describe your miniature, get a complete session plan with paints, steps, and basing.
        </p>
      </div>

      {/* Input form */}
      <div className="bg-white rounded-lg border border-stone-200 p-6 mb-6">
        {/* Description */}
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-stone-700 mb-1">
            What are you painting?
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder='e.g., "Blood Angels Intercessor, grimdark style" or "Stormcast Eternal with a desert base"'
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent resize-none"
            rows={3}
            maxLength={1000}
          />
          <div className="text-xs text-stone-400 mt-1 text-right">
            {description.length}/1000
          </div>
        </div>

        {/* Image upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Reference image (optional)
          </label>
          {imagePreview ? (
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Reference"
                className="h-32 w-32 object-cover rounded-md border border-stone-200"
              />
              <button
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-stone-900 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-stone-700"
              >
                x
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-stone-300 rounded-md py-6 text-center text-sm text-stone-500 hover:border-stone-400 hover:text-stone-600 transition-colors"
            >
              Drop a reference image here or click to upload
              <br />
              <span className="text-xs text-stone-400">JPEG, PNG, WebP, or GIF under 10MB</span>
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
          <label className="text-sm font-medium text-stone-700">Include basing?</label>
          <div className="flex gap-1">
            <button
              onClick={() => setIncludeBasing(true)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                includeBasing
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'border-stone-300 text-stone-500 hover:border-stone-400'
              }`}
            >
              Yes
            </button>
            <button
              onClick={() => setIncludeBasing(false)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                !includeBasing
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'border-stone-300 text-stone-500 hover:border-stone-400'
              }`}
            >
              No
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !description.trim()}
          className="w-full py-3 bg-stone-900 text-white font-medium rounded-md hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? 'Generating...' : 'Generate Session Plan'}
        </button>
      </div>

      {/* Loading indicator */}
      {isGenerating && !plan && (
        <div className="bg-white rounded-lg border border-stone-200 p-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-stone-900 rounded-full animate-pulse" />
            <span className="text-sm text-stone-500">Generating your painting plan... this takes 10-20 seconds</span>
          </div>
        </div>
      )}

      {/* Plan display */}
      {plan && (
        <PlanDisplay
          plan={plan}
          planId={planId}
          saveError={saveError}
        />
      )}
    </div>
  )
}

function PlanDisplay({
  plan,
  planId,
  saveError,
}: {
  plan: any
  planId: string | null
  saveError: string | null
}) {
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null)
  const supabase = createClient()

  async function submitFeedback(type: 'positive' | 'negative') {
    setFeedback(type)
    if (planId) {
      await supabase
        .from('session_plans')
        .update({ feedback: type })
        .eq('id', planId)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-stone-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold">{plan.title}</h2>
        <div className="flex items-center gap-3 mt-1 text-sm text-stone-500">
          <span className="inline-block px-2 py-0.5 bg-stone-100 rounded text-xs">
            {plan.style}
          </span>
          <span>~{plan.estimated_time_min} min</span>
          <span>{plan.paints?.length} paints</span>
          <span>{plan.steps?.length} steps</span>
        </div>
      </div>

      {/* Paint checklist */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-stone-700 mb-3">Paint Checklist</h3>
        <div className="space-y-2">
          {plan.paints?.map((paint: any, i: number) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <div
                className="w-5 h-5 rounded border border-stone-200 flex-shrink-0"
                style={{ backgroundColor: paint.hex_color || '#ccc' }}
              />
              <div className="flex-1">
                <span className="font-medium">{paint.name}</span>
                <span className="text-stone-400 ml-1">
                  {paint.brand} {paint.paint_type}
                </span>
              </div>
              <span className="text-xs text-stone-400">{paint.purpose}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-stone-700 mb-3">Step-by-Step Plan</h3>
        <div className="space-y-3">
          {plan.steps?.map((step: any) => (
            <div key={step.order} className="flex gap-3">
              <div className="w-6 h-6 bg-stone-900 text-white rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                {step.order}
              </div>
              <div className="text-sm">
                <p>{step.instruction}</p>
                {step.paint_name && (
                  <p className="text-stone-400 text-xs mt-0.5">
                    {step.paint_name} — {step.technique}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Basing */}
      {plan.basing?.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-stone-700 mb-3">Basing Plan</h3>
          <div className="space-y-3">
            {plan.basing.map((step: any) => (
              <div key={step.order} className="flex gap-3">
                <div className="w-6 h-6 bg-stone-600 text-white rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                  B{step.order}
                </div>
                <div className="text-sm">
                  <p>{step.instruction}</p>
                  <p className="text-stone-400 text-xs mt-0.5">
                    Materials: {step.materials?.join(', ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save error */}
      {saveError && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-700">
          {saveError}
        </div>
      )}

      {/* Feedback + AI note */}
      <div className="border-t border-stone-100 pt-4 flex items-center justify-between">
        <p className="text-xs text-stone-400">
          AI-generated plan — verify paint names against your collection
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => submitFeedback('positive')}
            className={`px-3 py-1 text-sm rounded border transition-colors ${
              feedback === 'positive'
                ? 'bg-green-50 border-green-300 text-green-700'
                : 'border-stone-200 text-stone-500 hover:border-stone-300'
            }`}
          >
            👍
          </button>
          <button
            onClick={() => submitFeedback('negative')}
            className={`px-3 py-1 text-sm rounded border transition-colors ${
              feedback === 'negative'
                ? 'bg-red-50 border-red-300 text-red-700'
                : 'border-stone-200 text-stone-500 hover:border-stone-300'
            }`}
          >
            👎
          </button>
        </div>
      </div>
    </div>
  )
}
