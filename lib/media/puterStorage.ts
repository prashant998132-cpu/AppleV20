// @ts-ignore — Puter types in lib/types/puter.d.ts
// lib/media/puterStorage.ts — Zero-Vercel Media Vault v1
// ══════════════════════════════════════════════════════════
// ARCHITECTURE:
//   ALL media (photos, audio, music, video, canvas) → Puter cloud
//   Puter = user's own FREE 1GB storage (puter.com account)
//   IndexedDB = metadata + thumbnail (120x120) ONLY — not full files
//   Vercel = serves HTML/JS only, ZERO media bytes ever
//   No matter how many images/videos generated/saved → free forever
// ══════════════════════════════════════════════════════════

// ── Puter folder structure ────────────────────────────────
const PUTER_ROOT = '/jarvis-pro'
export const PUTER_PATHS = {
  images:  `${PUTER_ROOT}/images`,
  audio:   `${PUTER_ROOT}/audio`,
  music:   `${PUTER_ROOT}/music`,
  video:   `${PUTER_ROOT}/video`,
  canvas:  `${PUTER_ROOT}/canvas`,
  docs:    `${PUTER_ROOT}/docs`,
}

// ── Puter loader ──────────────────────────────────────────
let _loaded = false
let _loading = false

export async function ensurePuter(): Promise<boolean> {
  if (_loaded && window.puter?.fs) return true
  if (typeof window === 'undefined') return false

  // Already in DOM?
  if (window.puter?.fs) { _loaded = true; return true }

  if (_loading) {
    return new Promise(res => {
      const t = setInterval(() => {
        if (_loaded) { clearInterval(t); res(true) }
        if (!_loading) { clearInterval(t); res(false) }
      }, 200)
      setTimeout(() => { clearInterval(t); res(false) }, 15000)
    })
  }

  _loading = true
  return new Promise(res => {
    if (document.querySelector('script[src*="puter.com"]')) {
      // Script already loading
      const wait = setInterval(() => {
        if (window.puter?.fs) { _loaded = true; _loading = false; clearInterval(wait); res(true) }
      }, 300)
      setTimeout(() => { clearInterval(wait); _loading = false; res(false) }, 12000)
      return
    }
    const s = document.createElement('script')
    s.src = 'https://js.puter.com/v2/'
    s.onload = () => {
      setTimeout(() => {
        _loaded = true; _loading = false
        res(!!window.puter?.fs)
      }, 800)  // Wait for Puter to init
    }
    s.onerror = () => { _loading = false; res(false) }
    document.head.appendChild(s)
  })
}

// ── Auth ──────────────────────────────────────────────────
export async function ensurePuterAuth(): Promise<boolean> {
  const ok = await ensurePuter()
  if (!ok || !window.puter) return false
  if (!window.puter.auth.isSignedIn()) {
    try { await window.puter.auth.signIn() } catch { return false }
  }
  return window.puter.auth.isSignedIn()
}

// ── Init folders (call once on app start) ────────────────
export async function initPuterFolders(): Promise<void> {
  const ok = await ensurePuterAuth()
  if (!ok || !window.puter?.fs) return
  await Promise.all(
    Object.values(PUTER_PATHS).map(p =>
      window.puter!.fs.mkdir(p, { createMissingParents: true }).catch(() => {})
    )
  )
}

// ── Save file to Puter ────────────────────────────────────
export async function puterSave(
  folder: keyof typeof PUTER_PATHS,
  filename: string,
  data: Blob | string
): Promise<string | null> {
  const ok = await ensurePuterAuth()
  if (!ok || !window.puter?.fs) return null
  try {
    const path = `${PUTER_PATHS[folder]}/${filename}`
    await window.puter.fs.write(path, data, { createMissingParents: true })
    return path
  } catch (e) {
    console.warn('[PuterStorage] save failed:', e)
    return null
  }
}

// ── Load file from Puter → blob URL ──────────────────────
export async function puterLoad(puterPath: string): Promise<string | null> {
  const ok = await ensurePuterAuth()
  if (!ok || !window.puter?.fs) return null
  try {
    const blob = await window.puter.fs.read(puterPath)
    return URL.createObjectURL(blob)
  } catch (e) {
    console.warn('[PuterStorage] load failed:', e)
    return null
  }
}

// ── Delete from Puter ─────────────────────────────────────
export async function puterDelete(puterPath: string): Promise<void> {
  const ok = await ensurePuterAuth()
  if (!ok || !window.puter?.fs) return
  try {
    await window.puter.fs.delete(puterPath)
  } catch {}
}

// ── List folder ───────────────────────────────────────────
export async function puterList(folder: keyof typeof PUTER_PATHS): Promise<string[]> {
  const ok = await ensurePuterAuth()
  if (!ok || !window.puter?.fs) return []
  try {
    const items = await window.puter.fs.readdir(PUTER_PATHS[folder])
    return items.filter(i => !i.is_dir).map(i => `${PUTER_PATHS[folder]}/${i.name}`)
  } catch { return [] }
}

// ── Get Puter storage stats ───────────────────────────────
export async function puterStorageStats(): Promise<{ used: string; available: string; puterEnabled: boolean }> {
  const ok = await ensurePuter()
  if (!ok) return { used: '—', available: '—', puterEnabled: false }
  try {
    let totalBytes = 0
    for (const folder of Object.values(PUTER_PATHS)) {
      const items = await window.puter!.fs.readdir(folder).catch(() => [])
      for (const item of items) {
        if (!item.is_dir) totalBytes += item.size || 0
      }
    }
    const usedMB = (totalBytes / 1024 / 1024).toFixed(1)
    return { used: `${usedMB} MB`, available: '1 GB free (Puter)', puterEnabled: true }
  } catch {
    return { used: '—', available: '1 GB free (Puter)', puterEnabled: true }
  }
}

// ════════════════════════════════════════════════════════
// HIGH-LEVEL SAVE HELPERS (used by Studio)
// ════════════════════════════════════════════════════════

// ── Save generated image ──────────────────────────────────
// Returns puterPath (persistent) — NOT a blob URL
export async function saveImageToPuter(
  imageUrlOrBlob: string | Blob,
  filename?: string
): Promise<string | null> {
  const fname = filename || `img_${Date.now()}.jpg`
  let blob: Blob

  if (typeof imageUrlOrBlob === 'string') {
    if (imageUrlOrBlob.startsWith('data:')) {
      // Convert base64 to blob
      const arr = imageUrlOrBlob.split(',')
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
      const bstr = atob(arr[1])
      const u8 = new Uint8Array(bstr.length)
      for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i)
      blob = new Blob([u8], { type: mime })
    } else if (imageUrlOrBlob.startsWith('blob:')) {
      // Fetch the blob URL
      try { blob = await fetch(imageUrlOrBlob).then(r => r.blob()) }
      catch { return null }
    } else {
      // External URL (e.g. Pollinations) — fetch and save
      try {
        const res = await fetch(imageUrlOrBlob, { signal: AbortSignal.timeout(15000) })
        if (!res.ok) return null
        blob = await res.blob()
      } catch { return null }
    }
  } else {
    blob = imageUrlOrBlob
  }

  return puterSave('images', fname, blob)
}

// ── Save audio blob ───────────────────────────────────────
export async function saveAudioToPuter(
  audioBlob: Blob,
  filename?: string
): Promise<string | null> {
  const ext = audioBlob.type.includes('wav') ? 'wav' : 'mp3'
  const fname = filename || `audio_${Date.now()}.${ext}`
  return puterSave('audio', fname, audioBlob)
}

// ── Save music blob ───────────────────────────────────────
export async function saveMusicToPuter(
  musicBlob: Blob,
  filename?: string
): Promise<string | null> {
  const fname = filename || `music_${Date.now()}.wav`
  return puterSave('music', fname, musicBlob)
}

// ── Save canvas PNG ───────────────────────────────────────
export async function saveCanvasToPuter(
  dataUrl: string,
  filename?: string
): Promise<string | null> {
  const fname = filename || `canvas_${Date.now()}.png`
  return puterSave('canvas', fname, dataUrl)
}

// ── Save video ────────────────────────────────────────────
export async function saveVideoToPuter(
  videoBlob: Blob,
  filename?: string
): Promise<string | null> {
  const fname = filename || `video_${Date.now()}.webm`
  return puterSave('video', fname, videoBlob)
}

// ── Load any media from Puter ─────────────────────────────
export async function loadFromPuter(puterPath: string): Promise<string | null> {
  return puterLoad(puterPath)
}

// ── Delete any media from Puter ───────────────────────────
export async function deleteFromPuter(puterPath: string): Promise<void> {
  return puterDelete(puterPath)
}

// ── Is Puter available check ──────────────────────────────
export function isPuterReady(): boolean {
  return typeof window !== 'undefined' && !!window.puter?.fs && window.puter.auth.isSignedIn()
}
