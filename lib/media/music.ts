// lib/media/music.ts — Zero-Vercel Music Manager
// All music/audio goes directly to external APIs from browser
// Vercel = zero bytes for music

export interface MusicOptions {
  prompt: string
  genre?: string
  mood?: string
  duration?: number
  onProgress?: (msg: string) => void
}

export interface MusicResult {
  url: string
  type: 'blob' | 'link'
  provider: string
}

// ── 1. HuggingFace MusicGen — Client-side (Zero Vercel) ──
export async function generateMusicHF(opts: MusicOptions): Promise<MusicResult> {
  const { prompt, genre, mood, duration = 15, onProgress } = opts
  const token = typeof window !== 'undefined' ? localStorage.getItem('jarvis_key_HUGGINGFACE_TOKEN') || '' : ''
  if (!token) throw new Error('no_hf_token')

  const fullPrompt = [prompt, genre, mood].filter(Boolean).join(', ')
  onProgress?.('HuggingFace MusicGen se music ban raha hai...')

  const res = await fetch('https://api-inference.huggingface.co/models/facebook/musicgen-small', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: fullPrompt, parameters: { duration } }),
    signal: AbortSignal.timeout(120000),
  })
  if (!res.ok) throw new Error('hf_music_' + res.status)
  const blob = await res.blob()
  onProgress?.('Done!')
  return { url: URL.createObjectURL(blob), type: 'blob', provider: 'HuggingFace MusicGen' }
}

// ── 2. Mubert — Deep link (Zero Vercel) ──────────────────
export function getMubertLink(opts: { genre?: string; mood?: string; duration?: number }): MusicResult {
  const { genre = 'lofi', mood = 'calm', duration = 30 } = opts
  const url = `https://mubert.com/render/tracks?genre=${encodeURIComponent(genre)}&mood=${encodeURIComponent(mood)}&duration=${duration}`
  return { url, type: 'link', provider: 'Mubert (External)' }
}

// ── 3. Suno AI link ──────────────────────────────────────
export function getSunoLink(prompt: string): MusicResult {
  return { url: 'https://suno.com', type: 'link', provider: 'Suno AI (External)' }
}

// ── 4. YouTube Music search ──────────────────────────────
export function getYouTubeMusic(query: string): MusicResult {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' music')}`
  return { url, type: 'link', provider: 'YouTube Music' }
}

// ── Main: Auto-cascade (all zero Vercel) ─────────────────
export async function generateMusic(opts: MusicOptions): Promise<MusicResult> {
  // Try HuggingFace first if token available
  try {
    return await generateMusicHF(opts)
  } catch (e: any) {
    if (e.message !== 'no_hf_token') {
      opts.onProgress?.('HF failed — Mubert link...')
    }
  }
  // Fallback: Mubert deep link
  return getMubertLink({ genre: opts.genre, mood: opts.mood, duration: opts.duration })
}

// ── Audio recording (client-side, zero Vercel) ───────────
export async function recordAudio(durationMs = 10000): Promise<Blob> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const recorder = new MediaRecorder(stream)
  const chunks: Blob[] = []
  return new Promise((resolve, reject) => {
    recorder.ondataavailable = e => chunks.push(e.data)
    recorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop())
      resolve(new Blob(chunks, { type: 'audio/webm' }))
    }
    recorder.onerror = () => reject(new Error('record_error'))
    recorder.start()
    setTimeout(() => recorder.stop(), durationMs)
  })
}
