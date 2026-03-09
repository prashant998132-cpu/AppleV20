// lib/providers/puter.ts — Puter.js AI Provider
// Types: lib/types/puter.d.ts (canonical)
// Free: GPT-4o, DALL-E 3, TTS onyx, Whisper — ZERO API key needed

// ─── Loader ──────────────────────────────────────────────
let _loaded = false, _loading = false

export async function loadPuter(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (_loaded && window.puter?.ai) return true
  if (window.puter?.ai) { _loaded = true; return true }
  if (_loading) {
    return new Promise(res => {
      const t = setInterval(() => { if (_loaded) { clearInterval(t); res(true) } }, 200)
      setTimeout(() => { clearInterval(t); res(false) }, 12000)
    })
  }
  _loading = true
  if (document.querySelector('script[src*="js.puter.com"]')) {
    return new Promise(res => {
      const t = setInterval(() => {
        if (window.puter?.ai) { _loaded = true; _loading = false; clearInterval(t); res(true) }
      }, 300)
      setTimeout(() => { clearInterval(t); _loading = false; res(false) }, 12000)
    })
  }
  return new Promise(res => {
    const s = document.createElement('script')
    s.src = 'https://js.puter.com/v2/'
    s.onload = () => setTimeout(() => { _loaded = true; _loading = false; res(!!window.puter?.ai) }, 800)
    s.onerror = () => { _loading = false; res(false) }
    document.head.appendChild(s)
  })
}

// ─── Auth ─────────────────────────────────────────────────
export async function isPuterReady(): Promise<boolean> {
  const ok = await loadPuter()
  if (!ok || !window.puter?.auth) return false
  try { return window.puter.auth.isSignedIn() } catch { return false }
}

export async function puterSignIn(): Promise<boolean> {
  const ok = await loadPuter()
  if (!ok || !window.puter?.auth) return false
  try { await window.puter.auth.signIn(); return true } catch { return false }
}

export function shouldTryPuter(): boolean {
  if (typeof window === 'undefined') return false
  const g = localStorage.getItem('jarvis_key_GROQ_API_KEY')
  const m = localStorage.getItem('jarvis_key_GEMINI_API_KEY')
  return !g && !m
}

// ─── Chat (non-streaming) ─────────────────────────────────
export async function puterChat(
  messages: { role: string; content: string }[],
  options: { model?: string } = {}
): Promise<string | null> {
  const ok = await loadPuter()
  if (!ok || !window.puter?.ai) return null
  try {
    const sys = messages.find(m => m.role === 'system')?.content || ''
    const conv = messages.filter(m => m.role !== 'system')
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n')
    const prompt = sys ? `${sys}\n\n${conv}\n\nAssistant:` : `${conv}\n\nAssistant:`
    const r = await window.puter.ai.chat(prompt, { model: options.model || 'gpt-4o-mini' })
    if (typeof r === 'string') return r
    return r?.message?.content || r?.content || String(r)
  } catch (e) { console.warn('[Puter] chat:', e); return null }
}

// ─── Streaming ────────────────────────────────────────────
export async function puterStream(
  messages: { role: string; content: string }[],
  onChunk: (c: string) => void,
  onDone:  (full: string) => void,
  onError?: (e: Error) => void
): Promise<void> {
  const ok = await loadPuter()
  if (!ok || !window.puter?.ai) { onError?.(new Error('Puter not available')); return }
  try {
    const sys = messages.find(m => m.role === 'system')?.content || ''
    const conv = messages.filter(m => m.role !== 'system')
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n')
    const prompt = sys ? `${sys}\n\n${conv}\n\nAssistant:` : `${conv}\n\nAssistant:`
    const res = await window.puter.ai.chat(prompt, { stream: true })
    let full = ''
    if (res && typeof (res as any)[Symbol.asyncIterator] === 'function') {
      for await (const chunk of res as any) {
        const t = chunk?.text || chunk?.delta?.content || ''
        if (t) { full += t; onChunk(t) }
      }
    } else {
      const t = typeof res === 'string' ? res : (res as any)?.message?.content || ''
      full = t
      const words = t.split(' ')
      for (const w of words) { onChunk(w + ' '); await new Promise(r => setTimeout(r, 15)) }
    }
    onDone(full)
  } catch (e) { onError?.(e instanceof Error ? e : new Error(String(e))) }
}

// ─── TTS (onyx voice) ─────────────────────────────────────
export async function puterTTS(text: string, voice = 'onyx'): Promise<string | null> {
  const ok = await loadPuter()
  if (!ok || !window.puter?.ai) return null
  try {
    const url = await (window.puter.ai as any).txt2speech(text.slice(0, 500), { voice })
    return typeof url === 'string' ? url : null
  } catch (e) { console.warn('[Puter] TTS:', e); return null }
}

// ─── DALL-E 3 Image ───────────────────────────────────────
export async function puterImage(prompt: string): Promise<string | null> {
  const ok = await loadPuter()
  if (!ok || !window.puter?.ai) return null
  try {
    const r = await (window.puter.ai as any).txt2img(prompt)
    return r?.src || r?.url || null
  } catch (e) { console.warn('[Puter] Image:', e); return null }
}

// ─── Whisper STT ──────────────────────────────────────────
export async function puterWhisper(blob: Blob): Promise<string | null> {
  const ok = await loadPuter()
  if (!ok || !window.puter?.ai) return null
  try {
    const r = await (window.puter.ai as any).chat(blob, { model: 'gpt-4o-mini-transcribe' })
    return typeof r === 'string' ? r : (r as any)?.text || null
  } catch (e) { console.warn('[Puter] Whisper:', e); return null }
}
