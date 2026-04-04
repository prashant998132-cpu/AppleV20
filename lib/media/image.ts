// lib/media/image.ts — Zero-Vercel Image Generation v2
// Cascade: Puter DALL-E 3 (free, high quality) → Pollinations (direct URL) → Gemini (binary stream)
// ALL images are URLs or Blobs — NEVER base64 JSON through Vercel

// ── 1. Pollinations — direct URL, zero Vercel ────────────
export function pollinationsUrl(
  prompt: string,
  opts: { width?: number; height?: number; model?: string; seed?: number } = {}
): string {
  const { width = 1024, height = 1024, model = 'flux', seed } = opts
  const p = encodeURIComponent(prompt)
  const s = seed || Math.floor(Math.random() * 999999)
  return `https://image.pollinations.ai/prompt/${p}?width=${width}&height=${height}&model=${model}&seed=${s}&nologo=true`
}

// ── 2. Puter DALL-E 3 — FREE, best quality ───────────────
export async function generateDallE3(prompt: string): Promise<string | null> {
  if (typeof window === 'undefined' || !window.puter?.ai) return null
  try {
    const r = await (window.puter.ai as any).txt2img(prompt)
    return r?.src || r?.url || null
  } catch { return null }
}

// ── 3. Gemini Imagen — server route, binary stream ───────
export async function generateGeminiServer(prompt: string): Promise<string | null> {
  const key = typeof window !== 'undefined' ? localStorage.getItem('jarvis_key_GEMINI_API_KEY') : null
  if (!key) return null
  try {
    const res = await fetch('/api/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, provider: 'gemini' }),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') || ''
    if (ct.startsWith('image/')) {
      const blob = await res.blob()
      return URL.createObjectURL(blob)
    }
    const j = await res.json()
    return j.imageUrl || null
  } catch { return null }
}

// ── Main generate — cascade ───────────────────────────────
export async function generateImage(
  prompt: string,
  opts: { preferPuter?: boolean; width?: number; height?: number } = {}
): Promise<{ url: string; provider: string }> {
  // Try Puter DALL-E 3 first if available (best quality, free)
  if (opts.preferPuter !== false && typeof window !== 'undefined' && window.puter?.auth?.isSignedIn()) {
    const url = await generateDallE3(prompt)
    if (url) return { url, provider: 'Puter DALL-E 3 (Free)' }
  }

  // Pollinations direct URL (always works, zero Vercel)
  const polUrl = pollinationsUrl(prompt, opts)
  return { url: polUrl, provider: 'Pollinations FLUX' }
}

// ── Video links (external, zero Vercel) ───────────────────
export function getVideoLinks(prompt: string) {
  const q = encodeURIComponent(prompt)
  return [
    { name: 'Pika Labs', url: `https://pika.art/create?prompt=${q}`, icon: '🎬' },
    { name: 'Runway',    url: `https://runwayml.com/create?prompt=${q}`, icon: '🎥' },
    { name: 'Kling AI',  url: `https://klingai.com/?prompt=${q}`, icon: '✨' },
    { name: 'Hailuo',   url: `https://hailuoai.com/video?prompt=${q}`, icon: '🌊' },
    { name: 'YouTube',  url: `https://youtube.com/results?search_query=${q}`, icon: '▶️' },
  ]
}
