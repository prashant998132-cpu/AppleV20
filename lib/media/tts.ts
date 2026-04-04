// lib/media/tts.ts — Zero-Vercel TTS Manager v1
// Strategy:
//   1. IndexedDB audio cache (zero cost, instant)
//   2. Browser Web Speech API (zero Vercel, always works)
//   3. /api/tts streaming binary (33% less bandwidth vs base64)
//   Cache: spoken text → audio blob in IndexedDB (never re-fetches)

const CACHE_DB = 'jarvis_tts_cache'
const CACHE_STORE = 'audio'
const MAX_CACHE = 80   // max cached clips
const MAX_CHARS = 300  // only cache short text

// ── IndexedDB audio cache ────────────────────────────────
function openCacheDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(CACHE_DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(CACHE_STORE, { keyPath: 'hash' })
    req.onsuccess = () => res(req.result)
    req.onerror   = () => rej(req.error)
  })
}

function hashText(text: string): string {
  // Simple hash for cache key
  let h = 0
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) - h) + text.charCodeAt(i)
    h |= 0
  }
  return `tts_${Math.abs(h)}`
}

async function getCached(text: string, voice: string): Promise<string | null> {
  if (text.length > MAX_CHARS) return null
  try {
    const db = await openCacheDB()
    return new Promise((res) => {
      const req = db.transaction(CACHE_STORE).objectStore(CACHE_STORE).get(hashText(text + voice))
      req.onsuccess = () => res(req.result?.dataUrl || null)
      req.onerror   = () => res(null)
    })
  } catch { return null }
}

async function saveCache(text: string, voice: string, dataUrl: string): Promise<void> {
  if (text.length > MAX_CHARS) return
  try {
    const db = await openCacheDB()
    const tx = db.transaction(CACHE_STORE, 'readwrite')
    const store = tx.objectStore(CACHE_STORE)
    store.put({ hash: hashText(text + voice), dataUrl, ts: Date.now() })
    // Evict oldest if over limit
    const all = await new Promise<any[]>(r => {
      const req = store.getAll(); req.onsuccess = () => r(req.result)
    })
    if (all.length > MAX_CACHE) {
      all.sort((a, b) => a.ts - b.ts)
      all.slice(0, all.length - MAX_CACHE).forEach(item => store.delete(item.hash))
    }
  } catch {}
}

// ── Browser Web Speech (Zero Vercel, Zero Cost) ──────────
export function speakBrowser(
  text: string,
  lang: 'hi' | 'en' = 'hi',
  speed = 1.0,
  onEnd?: () => void
): () => void {
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text.slice(0, 500))
  utt.lang  = lang === 'en' ? 'en-IN' : 'hi-IN'
  utt.rate  = Math.min(2, Math.max(0.5, speed))
  // Pick best available voice
  const voices = window.speechSynthesis.getVoices()
  const match  = voices.find(v => v.lang.startsWith(lang === 'en' ? 'en' : 'hi'))
    || voices.find(v => v.lang.startsWith('en'))
  if (match) utt.voice = match
  utt.onend = () => onEnd?.()
  utt.onerror = () => onEnd?.()
  window.speechSynthesis.speak(utt)
  return () => window.speechSynthesis.cancel()
}

// ── Server TTS — streams binary audio (NOT base64 JSON) ──
async function fetchServerTTS(
  text: string,
  lang: 'hi' | 'en',
  speed: number,
  voiceName?: string
): Promise<string> {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, lang, speed, voiceName, stream: true }),
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error('tts_server_' + res.status)

  // Server returns binary stream OR JSON fallback
  const contentType = res.headers.get('content-type') || ''

  if (contentType.startsWith('audio/')) {
    // Binary stream → blob URL (33% less bandwidth vs base64)
    const blob = await res.blob()
    return URL.createObjectURL(blob)
  } else {
    // JSON fallback (browser mode signal)
    const data = await res.json()
    if (data.useBrowser) throw new Error('use_browser')
    if (data.audioBase64) return `data:${data.mimeType || 'audio/mpeg'};base64,${data.audioBase64}`
    throw new Error('no_audio')
  }
}

// ── Main TTS function ────────────────────────────────────
export interface TTSOptions {
  text: string
  lang?: 'hi' | 'en'
  speed?: number
  voiceName?: string
  quality?: 'browser' | 'server'  // 'browser' = zero Vercel
  onStart?: () => void
  onEnd?: () => void
}

export async function speak(opts: TTSOptions): Promise<() => void> {
  const {
    text,
    lang = 'hi',
    speed = 1.0,
    voiceName,
    quality = 'browser',
    onStart,
    onEnd,
  } = opts

  if (!text.trim()) { onEnd?.(); return () => {} }

  onStart?.()

  // 1. Check cache first
  const cached = await getCached(text, voiceName || lang).catch(() => null)
  if (cached) {
    const audio = new Audio(cached)
    audio.playbackRate = speed
    audio.onended  = () => onEnd?.()
    audio.onerror  = () => onEnd?.()
    await audio.play().catch(() => onEnd?.())
    return () => { audio.pause(); audio.src = '' }
  }

  // 2. Battery check → force browser if low
  let batteryLow = false
  try {
    const b = await (navigator as any).getBattery?.()
    if (b && b.level < 0.2) batteryLow = true
  } catch {}

  // 3. Browser first (zero Vercel) — unless explicitly server quality
  if (quality === 'browser' || batteryLow) {
    const stop = speakBrowser(text, lang, speed, onEnd)
    return stop
  }

  // 4. Server streaming binary
  try {
    const audioUrl = await fetchServerTTS(text, lang, speed, voiceName)
    const isBlob = audioUrl.startsWith('blob:')
    const audio = new Audio(audioUrl)
    audio.playbackRate = speed
    audio.onended = () => {
      onEnd?.()
      if (isBlob) URL.revokeObjectURL(audioUrl)
    }
    audio.onerror = () => {
      onEnd?.()
      if (isBlob) URL.revokeObjectURL(audioUrl)
      // Fallback to browser
      speakBrowser(text, lang, speed)
    }
    await audio.play().catch(() => {
      speakBrowser(text, lang, speed, onEnd)
    })
    // Cache short texts
    if (text.length <= MAX_CHARS && audioUrl.startsWith('data:')) {
      saveCache(text, voiceName || lang, audioUrl).catch(() => {})
    }
    return () => { audio.pause(); if (isBlob) URL.revokeObjectURL(audioUrl) }
  } catch {
    // Final fallback: browser
    const stop = speakBrowser(text, lang, speed, onEnd)
    return stop
  }
}

// ── Preload browser voices (call once on app start) ──────
export function preloadVoices(): void {
  if (typeof window === 'undefined') return
  window.speechSynthesis.getVoices() // triggers voice list load
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices()
}

// ── Estimate Vercel bandwidth saved ──────────────────────
export function trackTTSSaving(method: 'browser' | 'server_stream' | 'server_base64' | 'cache'): void {
  try {
    const key = 'jarvis_tts_savings'
    const data = JSON.parse(localStorage.getItem(key) || '{}')
    data[method] = (data[method] || 0) + 1
    // Estimate: base64 avg ~100KB, stream ~67KB, browser/cache = 0
    const saved = (data.browser || 0) * 100 + (data.cache || 0) * 100 + (data.server_stream || 0) * 33
    data.savedKB = saved
    localStorage.setItem(key, JSON.stringify(data))
  } catch {}
}
