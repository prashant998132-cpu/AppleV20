'use client'
// app/media/page.tsx — JARVIS Media Vault v2 (AI Tags + Search + Puter Cloud)
// Architecture: Photos/Videos/Audio/Music → Puter cloud (user's own 1GB FREE)
//   IndexedDB = thumbnails + metadata ONLY (~3KB per item)
//   Vercel = serves HTML/JS once → ZERO media bytes ever
//   Unlimited saves: 10,000 photos/videos/audio won't touch Vercel free tier

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  ensurePuterAuth, initPuterFolders, saveImageToPuter,
  saveAudioToPuter, saveVideoToPuter, loadFromPuter,
  deleteFromPuter, puterStorageStats, ensurePuter
} from '../../lib/media/puterStorage'
import {
  mediaSave, mediaDelete, mediaGetAll, mediaUpdate,
  makeThumbnail, audioThumb, type MediaMeta
} from '../../lib/media/mediaStore'
import { smartCompress } from '../../lib/media/compress'
import { autoTag, matchesTags } from '../../lib/media/aiTagger'

// ── Styles ────────────────────────────────────────────────
const BG      = 'var(--bg)'
const CARD    = 'var(--bg-card)'
const BORDER  = 'var(--border)'
const ACCENT  = 'var(--accent)'
const DIM     = 'var(--text-faint)'

type TabType = 'photos' | 'videos' | 'audio' | 'music' | 'all'

// ── Full-screen viewer ────────────────────────────────────
function Viewer({
  item, onClose, onDelete
}: {
  item: MediaMeta
  onClose: () => void
  onDelete: () => void
}) {
  const [src, setSrc] = useState<string | null>(item.url || null)
  const [loading, setLoading] = useState(!item.url && !!item.puterPath)

  useEffect(() => {
    if (!item.url && item.puterPath) {
      loadFromPuter(item.puterPath).then(u => { setSrc(u); setLoading(false) }).catch(() => setLoading(false))
    }
  }, [item])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,.96)',
      display: 'flex', flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${BORDER}` }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: ACCENT, fontSize: 22, cursor: 'pointer' }}>←</button>
        <div style={{ fontSize: 12, color: '#a0c8e0', flex: 1, textAlign: 'center', padding: '0 10px', alignSelf: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.name}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {src && (
            <a href={src} download={item.name} style={{ background: 'none', border: 'none', color: ACCENT, fontSize: 18, cursor: 'pointer', textDecoration: 'none' }}>⬇</a>
          )}
          <button onClick={onDelete} style={{ background: 'none', border: 'none', color: '#ff5252', fontSize: 18, cursor: 'pointer' }}>🗑</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, border: `3px solid rgba(0,229,255,.2)`, borderTopColor: ACCENT, borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 12px' }}/>
            <div style={{ color: DIM, fontSize: 12 }}>Puter cloud se load ho raha hai...</div>
          </div>
        ) : !src ? (
          <div style={{ color: DIM, textAlign: 'center', fontSize: 13 }}>⚠️ File load nahi hua</div>
        ) : item.type === 'image' || item.type === 'canvas' ? (
          <img src={src} alt={item.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        ) : item.type === 'video' ? (
          <video src={src} controls style={{ maxWidth: '100%', maxHeight: '100%' }} playsInline />
        ) : (
          <div style={{ width: '90%', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{item.type === 'music' ? '🎵' : '🎙️'}</div>
            <div style={{ color: '#a0c8e0', marginBottom: 16, fontSize: 13 }}>{item.name}</div>
            <audio src={src} controls style={{ width: '100%' }} />
          </div>
        )}
      </div>

      {/* Meta + Tags */}
      <div style={{ padding: '10px 16px', borderTop: `1px solid ${BORDER}` }}>
        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
            {item.tags.map(t => (
              <span key={t} style={{ fontSize: 10, background: 'rgba(0,229,255,.1)', color: 'var(--accent)', padding: '2px 7px', borderRadius: 10, border: '1px solid rgba(0,229,255,.2)' }}>#{t}</span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {item.prompt && <div style={{ fontSize: 10, color: DIM }}>🎨 {item.prompt.slice(0, 60)}</div>}
          <div style={{ fontSize: 10, color: DIM, marginLeft: 'auto' }}>
            {new Date(item.timestamp).toLocaleDateString('hi-IN')} · {item.size ? `${(item.size / 1024).toFixed(0)}KB` : ''}
            {item.puterPath ? ' ☁️ Cloud' : ' 💾 Local'}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Media grid item ───────────────────────────────────────
function GridItem({ item, onTap, onLongPress, selected }: {
  item: MediaMeta
  onTap: () => void
  onLongPress: () => void
  selected: boolean
}) {
  const pressRef = useRef<NodeJS.Timeout | null>(null)

  const handleTouchStart = () => {
    pressRef.current = setTimeout(onLongPress, 600)
  }
  const handleTouchEnd = () => {
    if (pressRef.current) { clearTimeout(pressRef.current); pressRef.current = null }
  }

  const icon = item.type === 'video' ? '▶' : item.type === 'music' ? '🎵' : item.type === 'audio' ? '🎙️' : ''

  return (
    <div
      onClick={onTap}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        position: 'relative', borderRadius: 8, overflow: 'hidden',
        border: selected ? `2px solid ${ACCENT}` : '2px solid transparent',
        cursor: 'pointer', background: 'rgba(255,255,255,.03)',
        transition: 'border-color .15s',
      }}
    >
      {/* Square thumbnail */}
      <div style={{ aspectRatio: '1', overflow: 'hidden' }}>
        {item.thumb ? (
          <img src={item.thumb} alt={item.name} loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, minHeight: 80 }}>
            {item.type === 'image' ? '🖼️' : item.type === 'video' ? '🎬' : item.type === 'music' ? '🎵' : '🎙️'}
          </div>
        )}
        {icon && (
          <div style={{ position: 'absolute', bottom: 24, right: 4, fontSize: 11, background: 'rgba(0,0,0,.6)', padding: '2px 5px', borderRadius: 6 }}>
            {icon}
          </div>
        )}
        {selected && (
          <div style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#000' }}>✓</div>
        )}
        {item.liked && <div style={{ position: 'absolute', top: 4, left: 4, fontSize: 12 }}>❤️</div>}
        {item.puterPath && <div style={{ position: 'absolute', bottom: 24, left: 3, fontSize: 8, color: 'rgba(0,229,255,.7)' }}>☁</div>}
      </div>
      {/* Tags strip */}
      {item.tags && item.tags.length > 0 && (
        <div style={{ padding: '2px 3px', display: 'flex', gap: 2, flexWrap: 'nowrap', overflow: 'hidden', background: 'rgba(0,0,0,.6)' }}>
          {item.tags.slice(0, 2).map(t => (
            <span key={t} style={{ fontSize: 7, color: 'var(--accent)', background: 'rgba(0,229,255,.08)', padding: '0 3px', borderRadius: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 50 }}>{t}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────
export default function MediaVaultPage() {
  const [tab,       setTab]       = useState<TabType>('all')
  const [items,     setItems]     = useState<MediaMeta[]>([])
  const [loading,   setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selected,  setSelected]  = useState<Set<string>>(new Set())
  const [selecting, setSelecting] = useState(false)
  const [viewer,    setViewer]    = useState<MediaMeta | null>(null)
  const [toast,     setToast]     = useState('')
  const [puterOk,   setPuterOk]   = useState(false)
  const [stats,     setStats]     = useState('')
  const [recording, setRecording] = useState<'audio' | 'video' | null>(null)
  const [recTime,   setRecTime]   = useState(0)
  const [searchQ,   setSearchQ]   = useState('')
  const [aiTagging, setAiTagging] = useState<string | null>(null)  // item id being tagged

  const fileRef   = useRef<HTMLInputElement>(null)
  const recRef    = useRef<MediaRecorder | null>(null)
  const recTimer  = useRef<NodeJS.Timeout | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // ── Load ────────────────────────────────────────────────
  const loadItems = useCallback(async () => {
    setLoading(true)
    const type = tab === 'all' ? undefined : tab === 'photos' ? 'image' : tab === 'videos' ? 'video' : tab === 'audio' ? 'audio' : 'music'
    const all = await mediaGetAll(type as any).catch(() => [])
    setItems(all)
    setLoading(false)
  }, [tab])

  useEffect(() => {
    loadItems()
    // Init Puter in background
    ensurePuter().then(ok => {
      setPuterOk(ok)
      if (ok) {
        initPuterFolders().catch(() => {})
        puterStorageStats().then(s => setStats(`☁️ ${s.used} / ${s.available}`)).catch(() => {})
      }
    })
  }, [loadItems])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // ── Upload handler ───────────────────────────────────────
  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return
    setUploading(true)
    const needAuth = !window.puter?.auth?.isSignedIn()
    if (needAuth) {
      showToast('☁️ Puter login kar raha hun...')
      const ok = await ensurePuterAuth()
      if (!ok) { showToast('⚠️ Puter login failed — files IndexedDB mein save'); }
    }

    for (const file of Array.from(files)) {
      try {
        const type = file.type.startsWith('image/') ? 'image'
          : file.type.startsWith('video/') ? 'video'
          : file.type.startsWith('audio/') ? 'audio'
          : 'doc'

        if (type === 'doc') { showToast('📄 Docs abhi supported nahi'); continue }

        const id = `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        let thumb = ''
        let puterPath: string | null = null
        let size = file.size

        if (type === 'image') {
          showToast(`🗜️ Compress kar raha hun: ${file.name}`)
          const { blob, thumb: t } = await smartCompress(file)
          thumb = t
          size = blob.size
          showToast(`☁️ Cloud mein save kar raha hun...`)
          puterPath = await saveImageToPuter(blob, `${id}.jpg`).catch(() => null)
          // AI auto-tagging (background, non-blocking — uses thumbnail)
          setAiTagging(id)
          autoTag(t || '', file.name, true).then(aiTags => {
            if (aiTags.length) {
              mediaUpdate(id, { tags: aiTags }).catch(() => {})
              setItems(p => p.map(i => i.id === id ? { ...i, tags: aiTags } : i))
            }
          }).catch(() => {}).finally(() => setAiTagging(null))
        } else if (type === 'video') {
          thumb = ''  // Video thumbs are harder on mobile
          showToast(`☁️ Video upload kar raha hun...`)
          puterPath = await saveVideoToPuter(file, `${id}.webm`).catch(() => null)
        } else if (type === 'audio') {
          thumb = audioThumb(undefined, 'record')
          showToast(`☁️ Audio save kar raha hun...`)
          puterPath = await saveAudioToPuter(file, `${id}.${file.name.split('.').pop() || 'mp3'}`).catch(() => null)
        }

        const meta: MediaMeta = {
          id, type: type as any,
          name: file.name,
          timestamp: Date.now(),
          puterPath,
          thumb,
          size,
          tags: [],
          liked: false,
        }
        await mediaSave(meta)
        setItems(p => [meta, ...p])
        showToast(puterPath ? `✅ ${file.name} cloud mein save!` : `⚠️ ${file.name} local save (Puter unavailable)`)
      } catch (e) {
        showToast(`⚠️ ${file.name} save failed`)
      }
    }
    setUploading(false)
  }

  // ── Delete ───────────────────────────────────────────────
  const deleteItems = async (ids: string[]) => {
    for (const id of ids) {
      const item = items.find(i => i.id === id)
      if (item?.puterPath) deleteFromPuter(item.puterPath).catch(() => {})
      await mediaDelete(id)
    }
    setItems(p => p.filter(i => !ids.includes(i.id)))
    setSelected(new Set())
    setSelecting(false)
    setViewer(null)
    showToast(`🗑️ ${ids.length} item${ids.length > 1 ? 's' : ''} delete`)
  }

  // ── Record audio/video ────────────────────────────────────
  const startRecord = async (type: 'audio' | 'video') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        type === 'video' ? { video: true, audio: true } : { audio: true }
      )
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: type === 'video' ? 'video/webm' : 'audio/webm' })
        const id = `${type}_rec_${Date.now()}`
        const fname = `${id}.webm`
        showToast('☁️ Recording save kar raha hun...')
        const puterPath = type === 'video'
          ? await saveVideoToPuter(blob, fname).catch(() => null)
          : await saveAudioToPuter(blob, fname).catch(() => null)
        const thumb = type === 'audio' ? audioThumb(undefined, 'record') : ''
        const meta: MediaMeta = {
          id, type: type as any,
          name: `Recording ${new Date().toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })}`,
          timestamp: Date.now(), puterPath, thumb, size: blob.size,
          duration: recTime, tags: [], liked: false,
        }
        await mediaSave(meta)
        setItems(p => [meta, ...p])
        showToast(puterPath ? '✅ Recording cloud save!' : '⚠️ Local save')
        setRecording(null); setRecTime(0)
      }
      recRef.current = mr
      mr.start(1000)
      setRecording(type)
      recTimer.current = setInterval(() => setRecTime(t => t + 1), 1000)
    } catch { showToast('❌ Mic/Camera permission chahiye') }
  }

  const stopRecord = () => {
    recRef.current?.stop()
    if (recTimer.current) { clearInterval(recTimer.current); recTimer.current = null }
  }

  // ── Long press → select mode ──────────────────────────────
  const onLongPress = (id: string) => {
    setSelecting(true)
    setSelected(new Set([id]))
  }
  const onTap = (item: MediaMeta) => {
    if (selecting) {
      setSelected(p => { const n = new Set(p); n.has(item.id) ? n.delete(item.id) : n.add(item.id); return n })
    } else {
      setViewer(item)
    }
  }

  // ── Like toggle ───────────────────────────────────────────
  const toggleLike = async (id: string) => {
    const item = items.find(i => i.id === id)
    if (!item) return
    await mediaUpdate(id, { liked: !item.liked })
    setItems(p => p.map(i => i.id === id ? { ...i, liked: !i.liked } : i))
  }

  const TABS: { id: TabType; label: string; icon: string }[] = [
    { id: 'all',    label: 'All',    icon: '📁' },
    { id: 'photos', label: 'Photos', icon: '📸' },
    { id: 'videos', label: 'Videos', icon: '🎬' },
    { id: 'audio',  label: 'Audio',  icon: '🎙️' },
    { id: 'music',  label: 'Music',  icon: '🎵' },
  ]

  const filteredItems = (() => {
    let base = tab === 'all' ? items
      : tab === 'photos' ? items.filter(i => i.type === 'image' || i.type === 'canvas')
      : tab === 'videos' ? items.filter(i => i.type === 'video')
      : tab === 'audio'  ? items.filter(i => i.type === 'audio')
      : items.filter(i => i.type === 'music')
    if (!searchQ.trim()) return base
    const q = searchQ.toLowerCase()
    return base.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.prompt || '').toLowerCase().includes(q) ||
      matchesTags(i.tags || [], q)
    )
  })()

  return (
    <div style={{ minHeight: '100vh', background: BG, color: 'var(--text)', paddingBottom: 80 }}>
      {/* Viewer */}
      {viewer && (
        <Viewer
          item={viewer}
          onClose={() => setViewer(null)}
          onDelete={() => deleteItems([viewer.id])}
        />
      )}

      {/* Header */}
      <div style={{ padding: '14px 14px 0', background: `rgba(9,13,24,.97)`, borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: ACCENT }}>📁 Media Vault</div>
            <div style={{ fontSize: 9, color: DIM }}>{stats || (puterOk ? '☁️ Puter Cloud ready' : '⚠️ Puter sign in karein for cloud sync')}</div>
          </div>
          {selecting ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setSelecting(false); setSelected(new Set()) }}
                style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'none', color: '#a0c8e0', fontSize: 11, cursor: 'pointer' }}>
                Cancel
              </button>
              {selected.size > 0 && (
                <button onClick={() => deleteItems([...selected])}
                  style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(255,82,82,.3)', background: 'rgba(255,82,82,.08)', color: '#ff5252', fontSize: 11, cursor: 'pointer' }}>
                  🗑 Delete ({selected.size})
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              {/* Record buttons */}
              {recording ? (
                <button onClick={stopRecord}
                  style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,82,82,.15)', border: '1px solid rgba(255,82,82,.3)', color: '#ff5252', fontSize: 12, cursor: 'pointer', animation: 'pulse 1s infinite' }}>
                  ⏹ {Math.floor(recTime / 60)}:{String(recTime % 60).padStart(2, '0')}
                </button>
              ) : (
                <>
                  <button onClick={() => startRecord('audio')}
                    style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(0,229,255,.08)', border: `1px solid rgba(0,229,255,.2)`, color: ACCENT, fontSize: 12, cursor: 'pointer' }}>
                    🎙️
                  </button>
                  <button onClick={() => startRecord('video')}
                    style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(0,229,255,.08)', border: `1px solid rgba(0,229,255,.2)`, color: ACCENT, fontSize: 12, cursor: 'pointer' }}>
                    📹
                  </button>
                </>
              )}
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(0,229,255,.1)', border: `1px solid rgba(0,229,255,.25)`, color: ACCENT, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                {uploading ? '⏳' : '+ Upload'}
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 10 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500,
                background: tab === t.id ? 'rgba(0,229,255,.15)' : 'var(--bg-card)',
                color: tab === t.id ? ACCENT : DIM,
                borderBottom: tab === t.id ? `2px solid ${ACCENT}` : '2px solid transparent',
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search bar */}
      <div style={{ padding: '8px 14px 0', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: DIM }}>🔍</span>
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Search photos, tags... (dog, beach, subah)"
            style={{
              width: '100%', padding: '7px 34px 7px 30px', borderRadius: 10,
              background: 'var(--bg-card)', border: `1px solid ${BORDER}`,
              color: 'var(--text)', fontSize: 12, outline: 'none', boxSizing: 'border-box',
            }}
          />
          {searchQ && (
            <button onClick={() => setSearchQ('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: DIM, cursor: 'pointer', fontSize: 14 }}>✕</button>
          )}
        </div>
        {aiTagging && (
          <div style={{ fontSize: 9, color: '#ffab00', padding: '4px 0', textAlign: 'center' }}>
            🤖 AI photo mein dekh raha hai tags ke liye...
          </div>
        )}
      </div>

      {/* Upload zone (shown when empty) */}
      {!loading && filteredItems.length === 0 && (
        <div onClick={() => fileRef.current?.click()}
          style={{ margin: 16, padding: '40px 20px', border: `2px dashed ${BORDER}`, borderRadius: 16, textAlign: 'center', cursor: 'pointer' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>☁️</div>
          <div style={{ fontSize: 14, color: '#a0c8e0', marginBottom: 6 }}>Koi media nahi — Upload karo!</div>
          <div style={{ fontSize: 11, color: DIM }}>Photos • Videos • Audio • Music</div>
          <div style={{ fontSize: 10, color: DIM, marginTop: 8 }}>Puter cloud mein save → Vercel ka zero bandwidth use</div>
        </div>
      )}

      {/* Storage info banner */}
      {!puterOk && (
        <div style={{ margin: '12px 14px 0', padding: '10px 14px', background: 'rgba(255,171,0,.08)', border: '1px solid rgba(255,171,0,.2)', borderRadius: 10 }}>
          <div style={{ fontSize: 11, color: '#ffab00', fontWeight: 600 }}>⚠️ Puter Cloud Connect nahi hua</div>
          <div style={{ fontSize: 10, color: DIM, marginTop: 4 }}>Upload karo → Puter login popup aayega → Free 1GB cloud → Vercel ka bandwidth zero</div>
          <button onClick={() => ensurePuterAuth().then(ok => setPuterOk(ok))}
            style={{ marginTop: 8, padding: '4px 12px', borderRadius: 8, background: 'rgba(255,171,0,.15)', border: '1px solid rgba(255,171,0,.3)', color: '#ffab00', fontSize: 10, cursor: 'pointer' }}>
            🔑 Puter Login
          </button>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', paddingTop: 60 }}>
          <div style={{ width: 32, height: 32, border: `3px solid rgba(0,229,255,.2)`, borderTopColor: ACCENT, borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 12px' }}/>
          <div style={{ color: DIM, fontSize: 12 }}>Load ho raha hai...</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, padding: '12px 6px 0' }}>
          {filteredItems.map(item => (
            <GridItem
              key={item.id}
              item={item}
              onTap={() => onTap(item)}
              onLongPress={() => onLongPress(item.id)}
              selected={selected.has(item.id)}
            />
          ))}
        </div>
      )}

      {/* Count */}
      {filteredItems.length > 0 && (
        <div style={{ textAlign: 'center', padding: '14px 0 4px', fontSize: 10, color: DIM }}>
          {filteredItems.length} items · Long press for select · {items.filter(i => i.puterPath).length} in cloud
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(9,13,24,.97)', border: `1px solid ${BORDER}`, borderRadius: 24,
          padding: '8px 18px', fontSize: 12, color: '#a0c8e0', zIndex: 200, whiteSpace: 'nowrap',
          maxWidth: '90vw', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {toast}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef} type="file" multiple
        accept="image/*,video/*,audio/*"
        style={{ display: 'none' }}
        onChange={e => handleFiles(e.target.files)}
      />


      <style>{`
        @keyframes spin  { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
      `}</style>
    </div>
  )
}
