// lib/media/mediaStore.ts — Media Metadata + Thumbnails (IndexedDB)
// RULE: IndexedDB stores ONLY:
//   - metadata (id, type, name, timestamp, tags)
//   - thumbnail (120x120 base64 ~3KB) for grid display
//   - puterPath (pointer to actual file in Puter cloud)
//   NEVER store full images/audio/video here → Puter handles that

const DB_NAME = 'JarvisMedia_v1'
const DB_VERSION = 1

export type MediaType = 'image' | 'audio' | 'music' | 'video' | 'canvas' | 'doc'

export interface MediaMeta {
  id: string
  type: MediaType
  name: string
  timestamp: number
  puterPath: string | null   // null = URL-only (e.g. Pollinations)
  url?: string               // For Pollinations URLs (no Puter needed)
  thumb: string              // 120x120 base64 thumbnail
  size?: number              // bytes
  duration?: number          // audio/video seconds
  prompt?: string            // for generated images/music
  tags?: string[]
  liked?: boolean
  extra?: Record<string, any> // voice, style, genre, etc.
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('media')) {
        const store = db.createObjectStore('media', { keyPath: 'id' })
        store.createIndex('type', 'type', { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
    req.onsuccess = () => res(req.result)
    req.onerror   = () => rej(req.error)
  })
}

// ── CRUD ──────────────────────────────────────────────────
export async function mediaSave(meta: MediaMeta): Promise<void> {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx  = db.transaction('media', 'readwrite')
    const req = tx.objectStore('media').put(meta)
    tx.oncomplete = () => res()
    tx.onerror    = () => rej(tx.error)
  })
}

export async function mediaGet(id: string): Promise<MediaMeta | null> {
  const db = await openDB()
  return new Promise((res) => {
    const req = db.transaction('media', 'readonly').objectStore('media').get(id)
    req.onsuccess = () => res(req.result || null)
    req.onerror   = () => res(null)
  })
}

export async function mediaGetAll(type?: MediaType): Promise<MediaMeta[]> {
  const db = await openDB()
  return new Promise((res) => {
    let req: IDBRequest
    if (type) {
      const idx = db.transaction('media', 'readonly').objectStore('media').index('type')
      req = idx.getAll(IDBKeyRange.only(type))
    } else {
      req = db.transaction('media', 'readonly').objectStore('media').getAll()
    }
    req.onsuccess = () => res((req.result || []).sort((a: MediaMeta, b: MediaMeta) => b.timestamp - a.timestamp))
    req.onerror   = () => res([])
  })
}

export async function mediaDelete(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((res) => {
    const tx = db.transaction('media', 'readwrite')
    tx.objectStore('media').delete(id)
    tx.oncomplete = () => res()
    tx.onerror    = () => res()
  })
}

export async function mediaUpdate(id: string, updates: Partial<MediaMeta>): Promise<void> {
  const existing = await mediaGet(id)
  if (!existing) return
  await mediaSave({ ...existing, ...updates })
}

export async function mediaCount(type?: MediaType): Promise<number> {
  const all = await mediaGetAll(type)
  return all.length
}

// ── Thumbnail generator ───────────────────────────────────
export async function makeThumbnail(src: string | Blob, size = 120): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    const cleanup = (url?: string) => { if (url?.startsWith('blob:')) URL.revokeObjectURL(url) }

    img.onload = () => {
      const url = img.src
      const canvas = document.createElement('canvas')
      canvas.width = size; canvas.height = size
      const ctx = canvas.getContext('2d')!
      const side = Math.min(img.naturalWidth, img.naturalHeight)
      const sx = (img.naturalWidth - side) / 2
      const sy = (img.naturalHeight - side) / 2
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
      const thumb = canvas.toDataURL('image/jpeg', 0.6)
      cleanup(url)
      resolve(thumb)
    }
    img.onerror = () => { cleanup(img.src); resolve('') }

    if (typeof src === 'string') {
      img.crossOrigin = 'anonymous'
      img.src = src
    } else {
      img.src = URL.createObjectURL(src)
    }
  })
}

// ── Thumbnail for audio (waveform placeholder) ───────────
export function audioThumb(voice?: string, type: 'tts' | 'music' | 'record' = 'tts'): string {
  const canvas = document.createElement('canvas')
  canvas.width = 120; canvas.height = 120
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createLinearGradient(0, 0, 120, 120)
  if (type === 'music')       { grad.addColorStop(0, '#1a0a2e'); grad.addColorStop(1, '#4a0e8f') }
  else if (type === 'record') { grad.addColorStop(0, '#1a0a0a'); grad.addColorStop(1, '#8f0e0e') }
  else                        { grad.addColorStop(0, '#0a1a1a'); grad.addColorStop(1, '#0e5a6f') }
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 120, 120)
  // Draw fake waveform
  ctx.strokeStyle = type === 'music' ? '#a78bfa' : type === 'record' ? '#ff5252' : '#00e5ff'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  for (let x = 0; x < 120; x++) {
    const y = 60 + Math.sin(x * 0.3 + Math.random() * 0.5) * (10 + Math.random() * 20)
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.stroke()
  // Icon
  ctx.font = '28px sans-serif'; ctx.textAlign = 'center'
  ctx.fillText(type === 'music' ? '🎵' : type === 'record' ? '🎙️' : '🔊', 60, 50)
  ctx.font = 'bold 9px Arial'; ctx.fillStyle = type === 'music' ? '#a78bfa' : type === 'record' ? '#ff5252' : '#00e5ff'
  ctx.fillText(type.toUpperCase(), 60, 105)
  return canvas.toDataURL('image/jpeg', 0.7)
}

// ── Canvas thumbnail ──────────────────────────────────────
export function canvasThumb(dataUrl: string): string {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 120; canvas.height = 120
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.src = dataUrl
    ctx.drawImage(img, 0, 0, 120, 120)
    return canvas.toDataURL('image/jpeg', 0.6)
  } catch { return dataUrl }
}

// ── DB size estimate ──────────────────────────────────────
export async function mediaDbSize(): Promise<string> {
  try {
    const all = await mediaGetAll()
    const bytes = all.reduce((acc, m) => acc + (m.thumb?.length || 0) * 0.75, 0)
    return `~${(bytes / 1024).toFixed(0)} KB (thumbnails only)`
  } catch { return '—' }
}
