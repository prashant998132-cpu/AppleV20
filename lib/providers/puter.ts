// lib/providers/puter.ts — Puter.js v25 UPGRADED
// Free: GPT-4o, DALL-E 3, TTS, Whisper, KV Storage, FS — ZERO API key needed

// ─── Loader ───────────────────────────────────────────────
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

export function shouldTryPuter(): boolean {
  if (typeof window === 'undefined') return false
  const g = localStorage.getItem('jarvis_key_GROQ_API_KEY')
  const m = localStorage.getItem('jarvis_key_GEMINI_API_KEY')
  return !g && !m
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

// Auto-signin: try silently, if not signed in trigger login popup
export async function ensurePuterAuth(): Promise<boolean> {
  const ok = await loadPuter()
  if (!ok) return false
  try {
    if (window.puter?.auth?.isSignedIn()) return true
    await window.puter.auth.signIn()
    return window.puter.auth.isSignedIn()
  } catch { return false }
}

// ─── Chat — proper OpenAI messages array (no string concat!) ─
export async function puterChat(
  messages: { role: string; content: string }[],
  options: { model?: string } = {}
): Promise<string | null> {
  const ok = await loadPuter()
  if (!ok || !window.puter?.ai) return null
  try {
    const r = await window.puter.ai.chat(messages as any, {
      model: options.model || 'gpt-4o-mini',
    })
    if (typeof r === 'string') return r
    return r?.message?.content?.[0]?.text
        || r?.message?.content
        || r?.content
        || String(r)
  } catch (e) { console.warn('[Puter] chat:', e); return null }
}

// ─── Streaming — proper messages format ───────────────────
export async function puterStream(
  messages: { role: string; content: string }[],
  onChunk: (c: string) => void,
  onDone:  (full: string) => void,
  onError?: (e: Error) => void
): Promise<void> {
  const ok = await loadPuter()
  if (!ok || !window.puter?.ai) { onError?.(new Error('Puter not available')); return }
  try {
    const res = await window.puter.ai.chat(messages as any, { stream: true })
    let full = ''
    if (res && typeof (res as any)[Symbol.asyncIterator] === 'function') {
      for await (const chunk of res as any) {
        const t = chunk?.text
            || chunk?.delta?.content
            || chunk?.choices?.[0]?.delta?.content
            || ''
        if (t) { full += t; onChunk(t) }
      }
    } else {
      const t = typeof res === 'string' ? res
        : (res as any)?.message?.content || ''
      full = t
      for (const w of t.split(' ')) {
        onChunk(w + ' ')
        await new Promise(r => setTimeout(r, 12))
      }
    }
    onDone(full)
  } catch (e) { onError?.(e instanceof Error ? e : new Error(String(e))) }
}

// ─── Image — DALL-E 3 ─────────────────────────────────────
export async function puterImage(prompt: string): Promise<string | null> {
  const ok = await loadPuter()
  if (!ok || !window.puter?.ai) return null
  try {
    const r = await (window.puter.ai as any).txt2img(prompt)
    return r?.src || r?.url || null
  } catch (e) { console.warn('[Puter] image:', e); return null }
}

// ─── TTS — onyx voice ─────────────────────────────────────
export async function puterTTS(text: string, voice = 'onyx'): Promise<string | null> {
  const ok = await loadPuter()
  if (!ok || !window.puter?.ai) return null
  try {
    const url = await (window.puter.ai as any).txt2speech(text.slice(0, 500), { voice })
    return typeof url === 'string' ? url : null
  } catch (e) { console.warn('[Puter] TTS:', e); return null }
}

// ─── Whisper STT ──────────────────────────────────────────
export async function puterWhisper(blob: Blob): Promise<string | null> {
  const ok = await loadPuter()
  if (!ok || !window.puter?.ai) return null
  try {
    const r = await (window.puter.ai as any).chat(blob, { model: 'whisper-1' })
    return typeof r === 'string' ? r : (r as any)?.text || null
  } catch (e) { console.warn('[Puter] Whisper:', e); return null }
}

// ─── KV Storage — persistent, cross-device sync ───────────
// puter.kv syncs across devices when signed in; localStorage fallback when not
async function _kvOk(): Promise<boolean> {
  const ok = await loadPuter()
  return ok && !!window.puter?.kv
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  if (await _kvOk()) {
    try { await window.puter.kv.set('jarvis:' + key, JSON.stringify(value)); return } catch {}
  }
  try { localStorage.setItem('puter_kv_' + key, JSON.stringify(value)) } catch {}
}

export async function kvGet<T = unknown>(key: string, fallback: T | null = null): Promise<T | null> {
  if (await _kvOk()) {
    try {
      const v = await window.puter.kv.get('jarvis:' + key)
      return v !== null && v !== undefined ? JSON.parse(String(v)) : fallback
    } catch {}
  }
  try {
    const v = localStorage.getItem('puter_kv_' + key)
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}

export async function kvDel(key: string): Promise<void> {
  if (await _kvOk()) {
    try { await window.puter.kv.del('jarvis:' + key) } catch {}
  }
  try { localStorage.removeItem('puter_kv_' + key) } catch {}
}

export async function kvList(prefix = ''): Promise<string[]> {
  if (await _kvOk()) {
    try {
      const pattern = prefix ? `jarvis:${prefix}*` : 'jarvis:*'
      const r = await window.puter.kv.list(pattern)
      return Array.isArray(r)
        ? r.map((x: any) => (x?.key || String(x)).replace(/^jarvis:/, ''))
        : []
    } catch {}
  }
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i) || ''
    if (k.startsWith('puter_kv_')) {
      const stripped = k.slice(9)
      if (!prefix || stripped.startsWith(prefix)) keys.push(stripped)
    }
  }
  return keys
}

// ─── File Storage — save/read user files ──────────────────
export async function puterFSSave(filename: string, content: string): Promise<boolean> {
  const ok = await loadPuter()
  if (!ok || !window.puter?.fs) return false
  try {
    const blob = new Blob([content], { type: 'text/plain' })
    await window.puter.fs.write(`/jarvis/${filename}`, blob as any, { overwrite: true })
    return true
  } catch { return false }
}

export async function puterFSRead(filename: string): Promise<string | null> {
  const ok = await loadPuter()
  if (!ok || !window.puter?.fs) return null
  try {
    const f = await window.puter.fs.read(`/jarvis/${filename}`)
    return await (f as any).text()
  } catch { return null }
}
