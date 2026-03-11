'use client'
// ╔══════════════════════════════════════════════════════════╗
// ║  JARVIS STUDIO v3 — Completely separate creative suite   ║
// ║  5 tools: Image • Gallery • Voice • Music • Canvas       ║
// ║  All storage: IndexedDB (JarvisStudio DB)                ║
// ║  No dependency on Chat system whatsoever                 ║
// ╚══════════════════════════════════════════════════════════╝

import { useState, useRef, useEffect, useCallback } from 'react'
import BottomNav from '../../components/shared/BottomNav'
import { ensurePuterAuth, saveImageToPuter, saveAudioToPuter, saveMusicToPuter, saveCanvasToPuter, loadFromPuter, deleteFromPuter, initPuterFolders, puterStorageStats } from '../../lib/media/puterStorage'
import { mediaSave, mediaDelete, mediaGetAll, makeThumbnail, audioThumb, type MediaMeta } from '../../lib/media/mediaStore'
import { smartCompress, generateThumbnail } from '../../lib/media/compress'

// ════════════════════════════════════════════════════════════
// STUDIO-ONLY IndexedDB  (separate from JarvisDB_v3)
// ════════════════════════════════════════════════════════════
const SDB = 'JarvisStudio_v3'

function openSDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(SDB, 3)
    r.onupgradeneeded = () => {
      const db = r.result
      ;['images','audio','music','canvas','palettes'].forEach(s => {
        if (!db.objectStoreNames.contains(s))
          db.createObjectStore(s, { keyPath: 'id' })
      })
    }
    r.onsuccess = () => res(r.result)
    r.onerror   = () => rej(r.error)
  })
}
const sdbPut    = async (s: string, d: any) => { const db = await openSDB(); const tx = db.transaction(s,'readwrite'); tx.objectStore(s).put(d); return new Promise<void>(r => { tx.oncomplete = () => r() }) }
const sdbAll    = async (s: string): Promise<any[]> => { const db = await openSDB(); const tx = db.transaction(s,'readonly'); const r = tx.objectStore(s).getAll(); return new Promise((res,rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej() }) }
const sdbDel    = async (s: string, id: string) => { const db = await openSDB(); const tx = db.transaction(s,'readwrite'); tx.objectStore(s).delete(id); return new Promise<void>(r => { tx.oncomplete = () => r() }) }
const sdbClear  = async (s: string) => { const db = await openSDB(); const tx = db.transaction(s,'readwrite'); tx.objectStore(s).clear(); return new Promise<void>(r => { tx.oncomplete = () => r() }) }

// ════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════
interface StudioImage  { id:string; url:string; puterPath?:string; thumb?:string; prompt:string; style:string; model:string; ratio:string; timestamp:number; liked:boolean; tags:string[]; filter:string; seed:number }
interface StudioAudio  { id:string; text:string; voice:string; lang:string; timestamp:number; puterPath?:string; thumb?:string; source:'tts'|'url' }
interface StudioMusic  { id:string; prompt:string; genre:string; mood:string; timestamp:number; puterPath?:string; url?:string; thumb?:string; type:'blob'|'link'; duration:number }
interface StudioCanvas { id:string; name:string; dataUrl?:string; puterPath?:string; thumb?:string; timestamp:number }

// ════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════
const STYLES = [
  { id:'realistic',  label:'📸 Realistic',   tag:'photorealistic, 8K, sharp, detailed, professional' },
  { id:'anime',      label:'🌸 Anime',        tag:'anime style, Studio Ghibli, vibrant colors, detailed' },
  { id:'digital',    label:'🖌️ Digital Art',  tag:'digital art, concept art, trending on artstation' },
  { id:'oil',        label:'🎭 Oil Paint',    tag:'oil painting, impasto, artistic, museum quality' },
  { id:'sketch',     label:'✏️ Sketch',       tag:'pencil sketch, graphite, hand drawn, detailed linework' },
  { id:'watercolor', label:'💧 Watercolor',   tag:'watercolor painting, soft edges, dreamy, flowing' },
  { id:'cyberpunk',  label:'🌆 Cyberpunk',    tag:'cyberpunk, neon lights, rain, futuristic city, dark' },
  { id:'logo',       label:'🔷 Logo',         tag:'logo design, minimal, clean, vector art, white background' },
  { id:'portrait',   label:'👤 Portrait',     tag:'cinematic portrait, studio lighting, shallow depth' },
  { id:'wallpaper',  label:'🖥️ Wallpaper',    tag:'desktop wallpaper, 4K, stunning, atmospheric' },
  { id:'fantasy',    label:'🧙 Fantasy',      tag:'fantasy art, epic, magical atmosphere, dramatic lighting' },
  { id:'3d',         label:'🌀 3D Render',    tag:'3D render, octane render, cinema 4D, glossy surfaces' },
  { id:'manga',      label:'📖 Manga',        tag:'manga panel, black and white, bold lines, expressive' },
  { id:'pixel',      label:'👾 Pixel Art',    tag:'pixel art, 16-bit, retro game style, crisp pixels' },
  { id:'minimal',    label:'⬜ Minimal',      tag:'minimalist design, flat colors, geometric, clean' },
  { id:'neon',       label:'💜 Neon Glow',    tag:'neon glow, bioluminescent, dark background, vibrant' },
]

const RATIOS = [
  { id:'1:1',   label:'⬛ 1:1 Square',  w:1024, h:1024 },
  { id:'9:16',  label:'📱 9:16 Phone',  w:768,  h:1344 },
  { id:'16:9',  label:'🖥️ 16:9 Wide',  w:1344, h:768  },
  { id:'4:3',   label:'📺 4:3 Classic', w:1024, h:768  },
  { id:'3:4',   label:'📄 3:4 Print',   w:768,  h:1024 },
]

const MODELS = [
  { id:'flux',         label:'Flux',        desc:'Best quality'  },
  { id:'turbo',        label:'Turbo',       desc:'Fastest'       },
  { id:'flux-realism', label:'Flux Real',   desc:'Most realistic'},
  { id:'dreamshaper',  label:'DreamShaper', desc:'Artistic'      },
]

const CSS_FILTERS = [
  { id:'none',        label:'Original',    css:''                                              },
  { id:'vivid',       label:'Vivid',       css:'saturate(1.6) contrast(1.1)'                  },
  { id:'cold',        label:'Cold',        css:'hue-rotate(30deg) saturate(0.9)'              },
  { id:'warm',        label:'Warm',        css:'hue-rotate(-20deg) saturate(1.2) brightness(1.05)' },
  { id:'bw',          label:'B&W',         css:'grayscale(1)'                                 },
  { id:'sepia',       label:'Vintage',     css:'sepia(0.7) contrast(1.1)'                    },
  { id:'hdr',         label:'HDR',         css:'contrast(1.2) saturate(1.4) brightness(1.05)'},
  { id:'dreamy',      label:'Dreamy',      css:'blur(0.5px) brightness(1.1) saturate(1.2)'   },
  { id:'dark',        label:'Dark',        css:'brightness(0.75) contrast(1.2)'              },
  { id:'neon',        label:'Neon',        css:'saturate(2) hue-rotate(90deg) contrast(1.1)' },
]

const PROMPT_TEMPLATES = [
  { label:'🌄 Sunrise',      p:'Majestic sunrise over Vindhya mountain range, golden hour, mist in valleys, birds flying' },
  { label:'🏙️ Futuristic',   p:'Futuristic Indian city in 2100, flying vehicles, ancient temples with holographic overlays' },
  { label:'🧘 Meditation',    p:'Person meditating under banyan tree, soft morning light, lotus flowers, peaceful river' },
  { label:'🎓 Study Desk',   p:'Cozy study desk at night, books, lamp, coffee mug, soft warm light, motivational vibes' },
  { label:'🌌 Galaxy',       p:'Milky way galaxy over Indian village, rural landscape, clay pots, starry night sky' },
  { label:'🦁 Wildlife',     p:'Royal Bengal tiger in Kanha forest, golden light, fog, majestic and powerful' },
  { label:'🍛 Food',         p:'Authentic Indian thali, vibrant colors, all dishes perfectly arranged, appetizing' },
  { label:'🤖 Robot',        p:'Friendly AI robot helping a student in India, futuristic classroom, warm lighting' },
  { label:'⚡ JARVIS',       p:'Iron Man JARVIS holographic interface, blue neon circuits, dark background, futuristic' },
  { label:'🎆 Festival',     p:'Diwali night, diyas everywhere, fireworks, family celebration, warm golden glow' },
]

const TTS_VOICES = [
  { id:'hi-IN-SwaraNeural',   label:'Swara ♀',   lang:'hi', desc:'Hindi Female'   },
  { id:'hi-IN-MadhurNeural',  label:'Madhur ♂',  lang:'hi', desc:'Hindi Male'     },
  { id:'hi-IN-KavyaNeural',   label:'Kavya ♀',   lang:'hi', desc:'Hindi Female 2' },
  { id:'en-IN-NeerjaNeural',  label:'Neerja ♀',  lang:'en', desc:'English Female' },
  { id:'en-IN-PrabhatNeural', label:'Prabhat ♂', lang:'en', desc:'English Male'   },
]

const MUSIC_GENRES = [
  { id:'lofi',         label:'☕ Lo-Fi'           },
  { id:'classical',    label:'🎻 Classical'        },
  { id:'bollywood',    label:'🎬 Bollywood'        },
  { id:'meditation',   label:'🕉️ Meditation'      },
  { id:'hiphop',       label:'🎤 Hip-Hop'         },
  { id:'jazz',         label:'🎺 Jazz'             },
  { id:'edm',          label:'⚡ EDM'             },
  { id:'ambient',      label:'🌊 Ambient'         },
  { id:'rock',         label:'🎸 Rock'            },
  { id:'folk',         label:'🪘 Folk / Desi'     },
]

const MUSIC_MOODS = [
  { id:'happy',      label:'😊 Happy'    },
  { id:'sad',        label:'😢 Sad'      },
  { id:'focus',      label:'🎯 Focus'    },
  { id:'energetic',  label:'🔥 Energy'   },
  { id:'calm',       label:'😌 Calm'     },
  { id:'romantic',   label:'💕 Romantic' },
  { id:'epic',       label:'⚔️ Epic'     },
]

// ════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ════════════════════════════════════════════════════════════
const C = {
  card:   { background:'rgba(255,255,255,.025)', border:'1px solid rgba(255,255,255,.06)', borderRadius:14 } as React.CSSProperties,
  input:  { width:'100%', padding:'10px 13px', borderRadius:11, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box' as const, fontFamily:'inherit' },
  chip:   (on:boolean, color='#00e5ff') => ({ padding:'6px 13px', borderRadius:20, fontSize:11, cursor:'pointer' as const, border:`1px solid ${on ? color+'55' : 'rgba(255,255,255,.07)'}`, background: on ? color+'14' : 'transparent', color: on ? color : 'var(--border)', transition:'all .15s', whiteSpace:'nowrap' as const }),
  btn:    (c='#00e5ff', disabled=false) => ({ padding:'12px 0', width:'100%', borderRadius:13, fontSize:13, fontWeight:600, cursor: disabled ? 'not-allowed' as const : 'pointer' as const, background: disabled ? 'rgba(255,255,255,.03)' : `${c}18`, border:`1px solid ${disabled ? 'rgba(255,255,255,.06)' : c+'44'}`, color: disabled ? 'var(--text-faint)' : c, display:'flex' as const, alignItems:'center' as const, justifyContent:'center' as const, gap:8, transition:'all .15s' }),
  label:  { fontSize:10, color:'var(--border)', marginBottom:7, letterSpacing:.5 } as React.CSSProperties,
}

function Spinner({ color='#00e5ff' }: { color?: string }) {
  return <span style={{ width:14, height:14, border:`2px solid ${color}44`, borderTopColor:color, borderRadius:'50%', animation:'spin .8s linear infinite', display:'inline-block' }} />
}

function Chip({ label, active, onClick, color='#00e5ff' }: { label:string; active:boolean; onClick:()=>void; color?:string }) {
  return <button onClick={onClick} style={C.chip(active, color)}>{label}</button>
}

// ════════════════════════════════════════════════════════════
// 🎨  IMAGE GENERATOR
// ════════════════════════════════════════════════════════════
function ImageTab({ onSaved }: { onSaved: ()=>void }) {
  const [prompt,    setPrompt]    = useState('')
  const [neg,       setNeg]       = useState('')
  const [style,     setStyle]     = useState('realistic')
  const [ratio,     setRatio]     = useState('1:1')
  const [model,     setModel]     = useState('flux')
  const [filter,    setFilter]    = useState('none')
  const [variants,  setVariants]  = useState(1)
  const [enhance,   setEnhance]   = useState(true)
  const [showAdv,   setShowAdv]   = useState(false)
  const [seed,      setSeed]      = useState('')
  const [loading,   setLoading]   = useState(false)
  const [enhancing, setEnhancing] = useState(false)
  const [results,   setResults]   = useState<{url:string; seed:number}[]>([])
  const [selected,  setSelected]  = useState(0)
  const [saved,     setSaved]     = useState(false)
  const [history,   setHistory]   = useState<string[]>([])
  const [tag,       setTag]       = useState('')

  const selStyle  = STYLES.find(s => s.id === style)!
  const selRatio  = RATIOS.find(r => r.id === ratio)!
  const selFilter = CSS_FILTERS.find(f => f.id === filter)!

  // AI Prompt Enhancer via Gemini
  const enhancePrompt = async () => {
    if (!prompt.trim()) return
    const gemKey = localStorage.getItem('jarvis_key_GEMINI_API_KEY') || localStorage.getItem('jarvis_key_NEXT_PUBLIC_GEMINI_API_KEY') || ''
    if (!gemKey) { alert('Settings mein Gemini key daalo pehle') ; return }
    setEnhancing(true)
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${gemKey}`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ contents:[{ role:'user', parts:[{ text:`You are an expert AI image prompt engineer. Enhance this rough image idea into a detailed, vivid prompt for Stable Diffusion / Flux image generation. Keep it under 120 words. Return ONLY the enhanced prompt, nothing else.\n\nIdea: "${prompt.trim()}"\nStyle: ${selStyle.label}` }] }], generationConfig:{temperature:0.8, maxOutputTokens:200} }),
        signal: AbortSignal.timeout(10000),
      })
      const d = await res.json()
      const enhanced = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      if (enhanced) setPrompt(enhanced)
    } catch {}
    setEnhancing(false)
  }

  const generate = async () => {
    if (!prompt.trim() || loading) return
    setLoading(true); setResults([]); setSaved(false)
    setHistory(h => [prompt, ...h.filter(p => p !== prompt)].slice(0,8))
    const fullPrompt = enhance ? `${prompt.trim()}, ${selStyle.tag}` : prompt.trim()
    const negFull = neg.trim() || 'blurry, low quality, distorted, ugly, watermark, text'
    const count = variants
    const seeds = Array.from({length: count}, (_, i) => seed ? parseInt(seed)+i : Math.floor(Math.random()*99999)+i)
    const newResults: {url:string; seed:number}[] = []
    await Promise.all(seeds.map(async (s) => {
      const params = new URLSearchParams({ width:String(selRatio.w), height:String(selRatio.h), model, nologo:'true', seed:String(s), negative:negFull, enhance:String(enhance) })
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?${params}`
      await new Promise<void>(res => { const img = new Image(); img.onload = () => res(); img.onerror = () => res(); img.src = url })
      newResults.push({ url, seed: s })
    }))
    setResults(newResults); setSelected(0)
    setLoading(false)
  }

  const saveToGallery = async () => {
    if (!results.length) return
    const cur = results[selected]
    const id = `img_${Date.now()}`
    setSaved(true)
    // Generate thumbnail first (fast, client-side)
    const thumb = await makeThumbnail(cur.url, 120).catch(()=>'')
    // Save to Puter cloud (background — user's own storage, zero Vercel)
    const puterPath = await saveImageToPuter(cur.url, `${id}.jpg`).catch(()=>null)
    const img: StudioImage = {
      id, url: cur.url, puterPath: puterPath||undefined, thumb,
      prompt, style, model, ratio, timestamp: Date.now(),
      liked: false, tags: tag.split(',').map(t=>t.trim()).filter(Boolean),
      filter, seed: cur.seed,
    }
    await sdbPut('images', img)
    onSaved()
    setTimeout(() => setSaved(false), 2500)
  }

  const download = async () => {
    if (!results.length) return
    const a = document.createElement('a')
    a.href = results[selected].url; a.download = `studio_${Date.now()}.jpg`; a.target='_blank'; a.click()
  }

  return (
    <div style={{paddingBottom:80}}>
      {/* Prompt area */}
      <div style={{marginBottom:14}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7}}>
          <span style={C.label}>Prompt</span>
          <button onClick={enhancePrompt} disabled={!prompt.trim()||enhancing}
            style={{...C.chip(false,'#a78bfa'), fontSize:11, padding:'4px 10px', opacity:!prompt.trim()||enhancing?.5:1}}>
            {enhancing ? <Spinner color='#a78bfa'/> : '✨'} AI Enhance
          </button>
        </div>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
          placeholder="Kabhi bhi rough idea likho — JARVIS ko baaki karne do..."
          style={{...C.input, resize:'none', lineHeight:1.5}} />
        {/* Template chips */}
        <div style={{display:'flex', gap:5, marginTop:8, overflowX:'auto', paddingBottom:4}}>
          {PROMPT_TEMPLATES.map(t => (
            <button key={t.label} onClick={() => setPrompt(t.p)}
              style={{...C.chip(false), flexShrink:0, fontSize:10}}>
              {t.label}
            </button>
          ))}
        </div>
        {/* History */}
        {history.length > 0 && (
          <div style={{display:'flex', gap:5, marginTop:6, flexWrap:'wrap'}}>
            {history.slice(0,4).map(h => (
              <button key={h} onClick={() => setPrompt(h)}
                style={{...C.chip(false), fontSize:9, maxWidth:140, overflow:'hidden', textOverflow:'ellipsis'}}>
                ↺ {h.slice(0,22)}…
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Style grid */}
      <div style={{marginBottom:14}}>
        <div style={C.label}>Style</div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:5}}>
          {STYLES.map(s => (
            <button key={s.id} onClick={() => setStyle(s.id)}
              style={{padding:'7px 4px', borderRadius:10, fontSize:10, cursor:'pointer', textAlign:'center', border:`1px solid ${style===s.id?'rgba(0,229,255,.4)':'rgba(255,255,255,.06)'}`, background:style===s.id?'rgba(0,229,255,.1)':'rgba(255,255,255,.02)', color:style===s.id?'#00e5ff':'var(--border)', lineHeight:1.4}}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ratio + Model row */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14}}>
        <div>
          <div style={C.label}>Aspect Ratio</div>
          <div style={{display:'flex', flexDirection:'column', gap:5}}>
            {RATIOS.map(r => (
              <button key={r.id} onClick={() => setRatio(r.id)}
                style={{...C.chip(ratio===r.id), textAlign:'left', borderRadius:9, padding:'7px 10px'}}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={C.label}>Model</div>
          {MODELS.map(m => (
            <div key={m.id} style={{marginBottom:5}}>
              <button onClick={() => setModel(m.id)}
                style={{...C.chip(model===m.id), width:'100%', textAlign:'left', borderRadius:9, padding:'7px 10px', display:'flex', justifyContent:'space-between'}}>
                <span>{m.label}</span>
                <span style={{fontSize:9, opacity:.6}}>{m.desc}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Variants + Enhance */}
      <div style={{display:'flex', gap:8, marginBottom:14, alignItems:'center'}}>
        <div style={{flex:1}}>
          <div style={C.label}>Variants</div>
          <div style={{display:'flex', gap:5}}>
            {[1,2,3].map(v => (
              <button key={v} onClick={() => setVariants(v)}
                style={{...C.chip(variants===v), flex:1, textAlign:'center' as const}}>
                {v === 1 ? '1x' : v === 2 ? '2x' : '3x'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={C.label}>AI Style Tags</div>
          <button onClick={() => setEnhance(p=>!p)}
            style={C.chip(enhance, '#a78bfa')}>
            {enhance ? '✨ ON' : '✨ OFF'}
          </button>
        </div>
      </div>

      {/* Advanced */}
      <div style={{marginBottom:14}}>
        <button onClick={() => setShowAdv(p=>!p)} style={{background:'none',border:'none',color:'var(--border)',fontSize:11,cursor:'pointer',padding:0}}>
          {showAdv?'▲':'▼'} Advanced
        </button>
        {showAdv && (
          <div style={{marginTop:10, display:'flex', flexDirection:'column', gap:10}}>
            <div>
              <div style={C.label}>Negative Prompt</div>
              <input value={neg} onChange={e=>setNeg(e.target.value)} placeholder="Kya nahi chahiye image mein..." style={C.input}/>
            </div>
            <div>
              <div style={C.label}>Seed (same seed = same image)</div>
              <input value={seed} onChange={e=>setSeed(e.target.value)} placeholder="Random" type="number" style={C.input}/>
            </div>
            <div>
              <div style={C.label}>Tags (gallery mein sort ke liye)</div>
              <input value={tag} onChange={e=>setTag(e.target.value)} placeholder="nature, dark, portfolio..." style={C.input}/>
            </div>
          </div>
        )}
      </div>

      {/* Generate button */}
      <button onClick={generate} disabled={!prompt.trim()||loading} style={C.btn('#00e5ff', !prompt.trim()||loading)}>
        {loading ? <><Spinner/> Generating {variants > 1 ? `${variants} variants` : ''}…</> : `🎨 Generate ${variants>1?`${variants} Variants`:''}`}
      </button>

      {/* Results */}
      {results.length > 0 && (
        <div style={{marginTop:20}}>
          {/* Variant selector */}
          {results.length > 1 && (
            <div style={{display:'flex', gap:6, marginBottom:12}}>
              {results.map((_, i) => (
                <button key={i} onClick={() => setSelected(i)}
                  style={{flex:1, padding:'6px', borderRadius:8, fontSize:11, cursor:'pointer', border:`1px solid ${selected===i?'rgba(0,229,255,.4)':'rgba(255,255,255,.06)'}`, background:selected===i?'rgba(0,229,255,.1)':'transparent', color:selected===i?'#00e5ff':'var(--border)'}}>
                  V{i+1}
                </button>
              ))}
            </div>
          )}
          {/* Main image */}
          <div style={{borderRadius:14, overflow:'hidden', border:'1px solid rgba(0,229,255,.12)', position:'relative'}}>
            <img src={results[selected].url} alt={prompt}
              style={{width:'100%', display:'block', filter:selFilter.css}} loading="lazy"/>
            {/* Filter bar */}
            <div style={{background:'rgba(0,0,0,.7)', padding:'8px 10px', display:'flex', gap:5, overflowX:'auto'}}>
              {CSS_FILTERS.map(f => (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  style={{...C.chip(filter===f.id,'#00e5ff'), fontSize:9, padding:'3px 9px', flexShrink:0}}>
                  {f.label}
                </button>
              ))}
            </div>
            {/* Action bar */}
            <div style={{background:'rgba(0,0,0,.85)', padding:'10px 12px', display:'flex', gap:8}}>
              <button onClick={saveToGallery} disabled={saved}
                style={{flex:1, padding:'9px', borderRadius:10, fontSize:12, cursor:'pointer', border:`1px solid ${saved?'rgba(0,230,118,.3)':'rgba(0,229,255,.2)'}`, background:saved?'rgba(0,230,118,.12)':'rgba(0,229,255,.1)', color:saved?'#00e676':'#00e5ff', fontWeight:600}}>
                {saved ? '✅ Saved' : '💾 Save'}
              </button>
              <button onClick={download}
                style={{flex:1, padding:'9px', borderRadius:10, fontSize:12, cursor:'pointer', border:'1px solid rgba(167,139,250,.2)', background:'rgba(167,139,250,.1)', color:'#a78bfa'}}>
                ⬇️ Download
              </button>
              <button onClick={() => navigator.share?.({url:results[selected].url}).catch(()=>navigator.clipboard?.writeText(results[selected].url))}
                style={{flex:1, padding:'9px', borderRadius:10, fontSize:12, cursor:'pointer', border:'1px solid rgba(255,255,255,.08)', background:'rgba(255,255,255,.04)', color:'var(--border)'}}>
                ↗ Share
              </button>
            </div>
          </div>
          <div style={{fontSize:9, color:'#1a3050', textAlign:'center', marginTop:6}}>
            Seed: {results[selected].seed} · {selRatio.w}×{selRatio.h} · {model}
          </div>
          {/* Regenerate */}
          <button onClick={generate}
            style={{marginTop:8, width:'100%', padding:'9px', borderRadius:10, background:'transparent', border:'1px solid rgba(255,255,255,.06)', color:'var(--border)', fontSize:12, cursor:'pointer'}}>
            🔄 New Variants (different seeds)
          </button>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// 🖼️  GALLERY
// ════════════════════════════════════════════════════════════
function GalleryTab({ refreshKey }: { refreshKey: number }) {
  const [images,   setImages]   = useState<StudioImage[]>([])
  const [search,   setSearch]   = useState('')
  const [sort,     setSort]     = useState<'new'|'liked'|'style'>('new')
  const [expanded, setExpanded] = useState<StudioImage|null>(null)
  const [selStyle, setSelStyle] = useState('all')
  const [bulkMode, setBulkMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const load = useCallback(() => sdbAll('images').then(a => setImages(a.sort((x,y)=>y.timestamp-x.timestamp))).catch(()=>{}), [])
  useEffect(() => { load() }, [load, refreshKey])

  const del = async (id: string) => {
    const img = images.find(i => i.id === id)
    if (img?.puterPath) deleteFromPuter(img.puterPath).catch(()=>{})
    await sdbDel('images', id)
    setImages(p => p.filter(i => i.id !== id))
    if (expanded?.id === id) setExpanded(null)
  }

  const toggleLike = async (img: StudioImage) => {
    const u = {...img, liked: !img.liked}
    await sdbPut('images', u)
    setImages(p => p.map(i => i.id===img.id ? u : i))
    if (expanded?.id === img.id) setExpanded(u)
  }

  const bulkDelete = async () => {
    if (!selected.size || !confirm(`${selected.size} images delete karein?`)) return
    await Promise.all([...selected].map(id => sdbDel('images', id)))
    setImages(p => p.filter(i => !selected.has(i.id)))
    setSelected(new Set()); setBulkMode(false)
  }

  const clearAll = async () => {
    if (!confirm('Saari images delete karein?')) return
    await sdbClear('images'); setImages([])
  }

  const styles = ['all', ...new Set(images.map(i => i.style))]

  let filtered = images
  if (search)        filtered = filtered.filter(i => i.prompt.toLowerCase().includes(search.toLowerCase()) || i.tags?.some(t=>t.includes(search.toLowerCase())))
  if (selStyle!=='all') filtered = filtered.filter(i => i.style===selStyle)
  if (sort==='liked') filtered = [...filtered].sort((a,b) => (b.liked?1:0)-(a.liked?1:0))
  if (sort==='style') filtered = [...filtered].sort((a,b) => a.style.localeCompare(b.style))

  return (
    <div style={{paddingBottom:80}}>
      {/* Toolbar */}
      <div style={{display:'flex', gap:8, marginBottom:12}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search prompts, tags..."
          style={{...C.input, flex:1, padding:'8px 12px', fontSize:12}}/>
        <button onClick={() => setBulkMode(p=>!p)}
          style={{...C.chip(bulkMode,'#ff9944'), padding:'8px 10px', flexShrink:0}}>
          {bulkMode ? 'Done' : '☑️'}
        </button>
      </div>

      {/* Sort + Style filter */}
      <div style={{display:'flex', gap:6, marginBottom:12, overflowX:'auto', paddingBottom:4}}>
        {['new','liked','style'].map(s => <Chip key={s} label={s==='new'?'🕐 New':s==='liked'?'❤️ Liked':'🎨 Style'} active={sort===s} onClick={()=>setSort(s as any)}/>)}
        <div style={{width:1, background:'rgba(255,255,255,.08)', flexShrink:0}}/>
        {styles.map(s => <Chip key={s} label={s==='all'?'All':s} active={selStyle===s} onClick={()=>setSelStyle(s)}/>)}
      </div>

      {/* Stats */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
        <span style={{fontSize:10, color:'var(--text-faint)'}}>{filtered.length}/{images.length} images</span>
        <div style={{display:'flex', gap:8}}>
          {bulkMode && selected.size > 0 && <button onClick={bulkDelete} style={{...C.chip(true,'#ff4444'), fontSize:10, padding:'3px 10px'}}>Delete {selected.size}</button>}
          {images.length > 0 && <button onClick={clearAll} style={{background:'none', border:'none', color:'#ff4444', fontSize:10, cursor:'pointer'}}>Clear All</button>}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{textAlign:'center', padding:'50px 0', color:'var(--text-faint)', fontSize:13}}>
          {images.length === 0 ? '🎨 Koi image nahi — Image tab mein banao!' : 'Koi result nahi.'}
        </div>
      ) : (
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
          {filtered.map(img => {
            const isSel = selected.has(img.id)
            const imgFilter = CSS_FILTERS.find(f=>f.id===img.filter)?.css || ''
            return (
              <div key={img.id}
                style={{position:'relative', borderRadius:12, overflow:'hidden', border:`1px solid ${isSel?'rgba(0,229,255,.5)':'rgba(255,255,255,.06)'}`, cursor:'pointer', transition:'border .15s'}}
                onClick={() => bulkMode ? setSelected(p => { const n=new Set(p); n.has(img.id)?n.delete(img.id):n.add(img.id); return n }) : setExpanded(img)}>
                <img src={img.thumb || img.url} alt={img.prompt} loading="lazy"
                  style={{width:'100%', aspectRatio:'1', objectFit:'cover', display:'block', filter:imgFilter}}/>
                {img.liked && <div style={{position:'absolute', top:5, right:5, fontSize:12, textShadow:'0 1px 4px #000'}}>❤️</div>}
                {bulkMode && isSel && <div style={{position:'absolute', top:5, left:5, width:18, height:18, borderRadius:'50%', background:'#00e5ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10}}>✓</div>}
                {img.tags?.length > 0 && (
                  <div style={{position:'absolute', bottom:0, left:0, right:0, background:'linear-gradient(transparent,rgba(0,0,0,.75))', padding:'14px 6px 5px', display:'flex', gap:3, flexWrap:'wrap'}}>
                    {img.tags.slice(0,2).map(t => <span key={t} style={{fontSize:8, padding:'1px 5px', borderRadius:6, background:'rgba(0,229,255,.15)', color:'#00e5ff'}}>{t}</span>)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Expanded */}
      {expanded && (
        <div style={{position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,.96)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:16}}
          onClick={e => e.currentTarget===e.target && setExpanded(null)}>
          <button onClick={() => setExpanded(null)}
            style={{position:'absolute', top:16, right:16, background:'rgba(255,255,255,.1)', border:'none', color:'var(--text)', fontSize:20, width:34, height:34, borderRadius:'50%', cursor:'pointer'}}>✕</button>
          <img src={expanded.puterPath ? undefined : expanded.url} 
            ref={el => { 
              if(el && expanded.puterPath && !el.src) { 
                loadFromPuter(expanded.puterPath).then(u => { if(u && el) el.src = u }).catch(()=>{ if(el) el.src = expanded.url })
              } else if(el && !expanded.puterPath) { el.src = expanded.url }
            }}
            alt={expanded.prompt}
            style={{maxWidth:'100%', maxHeight:'65vh', borderRadius:12, objectFit:'contain', filter:CSS_FILTERS.find(f=>f.id===expanded.filter)?.css||''}}/>
          <div style={{marginTop:12, width:'100%', maxWidth:420}}>
            <div style={{fontSize:12, color:'#a0c8e0', marginBottom:10, lineHeight:1.5}}>
              {expanded.prompt.slice(0,100)}{expanded.prompt.length>100?'…':''}
            </div>
            <div style={{display:'flex', gap:8, marginBottom:8}}>
              <button onClick={() => toggleLike(expanded)}
                style={{flex:1, padding:'10px', borderRadius:10, fontSize:13, cursor:'pointer', border:`1px solid ${expanded.liked?'rgba(255,107,107,.4)':'rgba(255,255,255,.08)'}`, background:expanded.liked?'rgba(255,107,107,.12)':'rgba(255,255,255,.04)', color:expanded.liked?'#ff6b6b':'var(--border)'}}>
                {expanded.liked ? '❤️ Liked' : '🤍 Like'}
              </button>
              <a href={expanded.url} download={`studio_${expanded.id}.jpg`} target="_blank" rel="noreferrer"
                style={{flex:1, padding:'10px', borderRadius:10, fontSize:13, textDecoration:'none', textAlign:'center', border:'1px solid rgba(167,139,250,.2)', background:'rgba(167,139,250,.1)', color:'#a78bfa'}}>
                ⬇️ Download
              </a>
              <button onClick={() => del(expanded.id)}
                style={{flex:1, padding:'10px', borderRadius:10, fontSize:13, cursor:'pointer', border:'1px solid rgba(255,80,80,.2)', background:'rgba(255,80,80,.08)', color:'#ff6060'}}>
                🗑️ Delete
              </button>
            </div>
            <div style={{fontSize:10, color:'var(--text-faint)', textAlign:'center'}}>
              {expanded.style} · {expanded.model} · {new Date(expanded.timestamp).toLocaleString('hi-IN')}
              {expanded.tags?.length > 0 && <> · {expanded.tags.join(', ')}</>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// 🎙️  VOICE / TTS
// ════════════════════════════════════════════════════════════
function VoiceTab() {
  const [mode,      setMode]    = useState<'text'|'url'>('text')
  const [text,      setText]    = useState('')
  const [url,       setUrl]     = useState('')
  const [voice,     setVoice]   = useState('hi-IN-SwaraNeural')
  const [speed,     setSpeed]   = useState(1.0)
  const [loading,   setLoading] = useState(false)
  const [fetching,  setFetching]= useState(false)
  const [audioUrl,  setAudioUrl]= useState<string|null>(null)
  const [saved,     setSaved]   = useState(false)
  const [history,   setHistory] = useState<StudioAudio[]>([])
  const audioRef = useRef<HTMLAudioElement|null>(null)

  useEffect(() => { sdbAll('audio').then(a=>setHistory(a.sort((x,y)=>y.timestamp-x.timestamp))).catch(()=>{}) }, [])

  const fetchUrl = async () => {
    if (!url.trim()) return
    setFetching(true)
    try {
      const res = await fetch(`/api/fetch-url`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({url:url.trim()}) })
      const d = await res.json()
      if (d.text) { setText(d.text.slice(0,1500)); setMode('text') }
    } catch { alert('URL fetch fail hua. Manually text paste karo.') }
    setFetching(false)
  }

  const generate = async () => {
    if (!text.trim() || loading) return
    setLoading(true); setAudioUrl(null); setSaved(false)
    const sel = TTS_VOICES.find(v=>v.id===voice)!
    try {
      // 1. Try Puter TTS (free OpenAI onyx — zero Vercel bandwidth)
      if (window.puter?.auth?.isSignedIn?.()) {
        try {
          const puterUrl = await (window.puter.ai as any).txt2speech(
            text.trim().slice(0,500), { voice: 'onyx' }
          )
          if (typeof puterUrl === 'string' && puterUrl) {
            setAudioUrl(puterUrl); setLoading(false); return
          }
        } catch {}
      }
      // 2. Server TTS → binary stream (not base64)
      const res = await fetch('/api/tts', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({text:text.trim().slice(0,1000), lang:sel.lang, speed, voiceName:voice}),
        signal:AbortSignal.timeout(20000),
      })
      if (res.ok) {
        const ct = res.headers.get('content-type') || ''
        if (ct.startsWith('audio/')) {
          const blob = await res.blob()
          setAudioUrl(URL.createObjectURL(blob))
        } else {
          const d = await res.json()
          if (d.useBrowser) { browserSpeak() }
          else if (d.audioBase64) {
            // Legacy fallback only
            setAudioUrl(`data:${d.mimeType||'audio/mp3'};base64,${d.audioBase64}`)
          } else { browserSpeak() }
        }
      } else { browserSpeak() }
    } catch { browserSpeak() }
    setLoading(false)
  }

  const browserSpeak = () => {
    const sel = TTS_VOICES.find(v=>v.id===voice)!
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text.trim())
    utt.lang = sel.lang==='en'?'en-IN':'hi-IN'; utt.rate = speed
    const vs = window.speechSynthesis.getVoices()
    const m = vs.find(v=>v.lang.startsWith(sel.lang==='en'?'en':'hi'))
    if (m) utt.voice = m
    window.speechSynthesis.speak(utt)
  }

  const saveAudio = async () => {
    if (!audioUrl) return
    const sel = TTS_VOICES.find(v=>v.id===voice)!
    const id = `tts_${Date.now()}`
    setSaved(true)
    // Convert audioUrl to blob
    let puterPath: string | undefined
    try {
      const blob = audioUrl.startsWith('blob:')
        ? await fetch(audioUrl).then(r=>r.blob())
        : await (async()=>{ const arr=audioUrl.split(','); const mime=arr[0].match(/:(.*?);/)?.[1]||'audio/mpeg'; const b=atob(arr[1]); const u=new Uint8Array(b.length); for(let i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return new Blob([u],{type:mime}) })()
      const p = await saveAudioToPuter(blob, `${id}.mp3`)
      if(p) puterPath = p
    } catch {}
    const thumb = audioThumb(voice, 'tts')
    const item: StudioAudio = { id, text:text.trim(), voice, lang:sel.lang, timestamp:Date.now(), puterPath, thumb, source: url.trim()?'url':'tts' }
    await sdbPut('audio', item)
    setHistory(p=>[item,...p].slice(0,20))
    setTimeout(()=>setSaved(false),2000)
  }

  const download = () => {
    if (!audioUrl) return
    const a = document.createElement('a'); a.href=audioUrl; a.download=`studio_tts_${Date.now()}.mp3`; a.click()
  }

  const QUICK = ['Kal exam hai. Padhai karo, bhai!', 'JARVIS is your personal AI. Always here.', 'आज का दिन शानदार बनाओ।', 'Focus on the goal, not the noise.']

  return (
    <div style={{paddingBottom:80}}>
      {/* Mode toggle */}
      <div style={{display:'flex', gap:8, marginBottom:16}}>
        {(['text','url'] as const).map(m => (
          <button key={m} onClick={()=>setMode(m)} style={{...C.chip(mode===m), flex:1, textAlign:'center' as const, padding:'9px'}}>
            {m==='text' ? '✍️ Type Text' : '🔗 URL/Article'}
          </button>
        ))}
      </div>

      {mode==='url' ? (
        <div style={{marginBottom:14}}>
          <div style={C.label}>Article / Blog URL</div>
          <div style={{display:'flex', gap:8}}>
            <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://..." style={{...C.input, flex:1}}/>
            <button onClick={fetchUrl} disabled={!url.trim()||fetching}
              style={{...C.chip(!url.trim()||fetching?false:true), padding:'10px 14px', flexShrink:0}}>
              {fetching ? <Spinner/> : 'Fetch'}
            </button>
          </div>
          <div style={{fontSize:10, color:'var(--text-faint)', marginTop:6}}>Article ka text automatically extract ho jaayega → phir TTS generate karo</div>
          {text && (
            <div style={{marginTop:10, padding:'10px 12px', background:'rgba(0,229,255,.04)', border:'1px solid rgba(0,229,255,.1)', borderRadius:10}}>
              <div style={{fontSize:10, color:'#2a6080', marginBottom:5}}>✅ Text extracted ({text.length} chars)</div>
              <div style={{fontSize:12, color:'#8aaccc', lineHeight:1.5}}>{text.slice(0,200)}…</div>
              <button onClick={() => setMode('text')} style={{...C.chip(false), marginTop:8, fontSize:10}}>Edit text →</button>
            </div>
          )}
        </div>
      ) : (
        <div style={{marginBottom:14}}>
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:7}}>
            <span style={C.label}>Text</span>
            <span style={{fontSize:10, color:text.length>900?'#ff6060':'var(--text-faint)'}}>{text.length}/1000</span>
          </div>
          <textarea value={text} onChange={e=>setText(e.target.value.slice(0,1000))} rows={5}
            placeholder="Jo bolwana chahte ho..." style={{...C.input, resize:'none', lineHeight:1.6}}/>
          <div style={{display:'flex', gap:5, marginTop:8, flexWrap:'wrap'}}>
            {QUICK.map(q => <button key={q} onClick={()=>setText(q)} style={{...C.chip(false), fontSize:10, padding:'4px 9px'}}>{q.slice(0,25)}…</button>)}
          </div>
        </div>
      )}

      {/* Voice */}
      <div style={{marginBottom:14}}>
        <div style={C.label}>Voice</div>
        <div style={{display:'flex', flexDirection:'column', gap:5}}>
          {TTS_VOICES.map(v => (
            <button key={v.id} onClick={()=>setVoice(v.id)}
              style={{...C.chip(voice===v.id), width:'100%', textAlign:'left' as const, borderRadius:10, padding:'9px 13px', display:'flex', justifyContent:'space-between'}}>
              <span>{v.label}</span>
              <span style={{fontSize:10, opacity:.6}}>{v.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Speed */}
      <div style={{marginBottom:20}}>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:8}}>
          <span style={C.label}>Speed</span>
          <span style={{fontSize:11, color:'#00e5ff'}}>{speed.toFixed(1)}×</span>
        </div>
        <input type="range" min=".5" max="2" step=".1" value={speed} onChange={e=>setSpeed(parseFloat(e.target.value))} style={{width:'100%', accentColor:'#00e5ff'}}/>
        <div style={{display:'flex', justifyContent:'space-between', fontSize:9, color:'var(--text-faint)', marginTop:3}}><span>0.5× Slow</span><span>Normal</span><span>2× Fast</span></div>
      </div>

      <button onClick={generate} disabled={!text.trim()||loading} style={C.btn('#00e5ff', !text.trim()||loading)}>
        {loading ? <><Spinner/> Generating…</> : '🎙️ Generate Audio'}
      </button>

      {audioUrl && (
        <div style={{marginTop:16, padding:14, background:'rgba(0,229,255,.04)', border:'1px solid rgba(0,229,255,.1)', borderRadius:12}}>
          <div style={{fontSize:11, color:'#2a6080', marginBottom:8}}>🎵 Audio ready</div>
          <audio ref={audioRef} src={audioUrl} controls style={{width:'100%', height:36}}/>
          <div style={{display:'flex', gap:8, marginTop:10}}>
            <button onClick={saveAudio} style={{flex:1, padding:'9px', borderRadius:10, fontSize:12, cursor:'pointer', border:`1px solid ${saved?'rgba(0,230,118,.3)':'rgba(0,229,255,.2)'}`, background:saved?'rgba(0,230,118,.1)':'rgba(0,229,255,.08)', color:saved?'#00e676':'#00e5ff'}}>
              {saved?'✅ Saved':'💾 Save'}
            </button>
            <button onClick={download} style={{flex:1, padding:'9px', borderRadius:10, fontSize:12, cursor:'pointer', border:'1px solid rgba(167,139,250,.2)', background:'rgba(167,139,250,.1)', color:'#a78bfa'}}>⬇️ MP3</button>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div style={{marginTop:20}}>
          <div style={{fontSize:10, color:'var(--border)', marginBottom:10}}>Saved TTS ({history.length})</div>
          {history.slice(0,6).map(item => (
            <div key={item.id} style={{...C.card, padding:'10px 12px', marginBottom:7, display:'flex', alignItems:'center', gap:10}}>
              <button onClick={async() => { 
  if(!audioRef.current) return
  if(item.puterPath){
    const url = await loadFromPuter(item.puterPath).catch(()=>null)
    if(url){ audioRef.current.src=url; audioRef.current.play() }
  }
}}
                style={{width:30, height:30, borderRadius:'50%', background:'rgba(0,229,255,.1)', border:'1px solid rgba(0,229,255,.2)', color:'#00e5ff', fontSize:12, cursor:'pointer', flexShrink:0}}>▶</button>
              <div style={{flex:1, overflow:'hidden'}}>
                <div style={{fontSize:11, color:'#c8dff0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{item.text.slice(0,45)}…</div>
                <div style={{fontSize:9, color:'var(--text-faint)', marginTop:2}}>{item.source==='url'?'🔗':'✍️'} {item.voice.split('-').slice(0,2).join('-')} · {new Date(item.timestamp).toLocaleString('hi-IN',{hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'})}</div>
              </div>
              <button onClick={() => sdbDel('audio',item.id).then(()=>setHistory(p=>p.filter(i=>i.id!==item.id)))}
                style={{background:'none', border:'none', color:'#ff4444', fontSize:16, cursor:'pointer', flexShrink:0}}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// 🎵  MUSIC
// ════════════════════════════════════════════════════════════
function MusicTab() {
  const [genre,    setGenre]    = useState('')
  const [mood,     setMood]     = useState('')
  const [custom,   setCustom]   = useState('')
  const [duration, setDuration] = useState(15)
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState<{url:string; type:'blob'|'link'}|null>(null)
  const [tip,      setTip]      = useState('')
  const [history,  setHistory]  = useState<StudioMusic[]>([])
  const [hfReady,  setHfReady]  = useState(false)

  useEffect(() => {
    sdbAll('music').then(m=>setHistory(m.sort((a,b)=>b.timestamp-a.timestamp))).catch(()=>{})
    const hfKey = typeof window !== 'undefined' ? localStorage.getItem('jarvis_key_HUGGINGFACE_TOKEN')||'' : ''
    setHfReady(!!hfKey)
  }, [])

  const generate = async () => {
    if (!genre && !mood && !custom || loading) return
    setLoading(true); setResult(null)
    const prompt = [genre ? MUSIC_GENRES.find(g=>g.id===genre)?.label.replace(/^.+\s/,'') : '', mood ? MUSIC_MOODS.find(m=>m.id===mood)?.label.replace(/^.+\s/,'') : '', custom].filter(Boolean).join(', ')

    const hfToken = typeof window !== 'undefined' ? localStorage.getItem('jarvis_key_HUGGINGFACE_TOKEN')||'' : ''

    if (hfToken) {
      setTip('HuggingFace MusicGen loading…')
      try {
        const res = await fetch('https://api-inference.huggingface.co/models/facebook/musicgen-small', {
          method:'POST', headers:{Authorization:`Bearer ${hfToken}`, 'Content-Type':'application/json'},
          body: JSON.stringify({inputs:prompt, parameters:{duration}}),
          signal: AbortSignal.timeout(90000),
        })
        if (res.ok) {
          const blob = await res.blob()
          const blobUrl = URL.createObjectURL(blob)
          setResult({url: blobUrl, type:'blob'})
          const id = `music_${Date.now()}`
          const thumb = audioThumb(undefined, 'music')
          // Save to Puter (background) - so music persists after page refresh
          const puterPath = await saveMusicToPuter(blob, `${id}.wav`).catch(()=>null)
          const saved: StudioMusic = {id, prompt, genre, mood, timestamp:Date.now(), puterPath:puterPath||undefined, thumb, type:'blob', duration}
          await sdbPut('music', saved)
          setHistory(p=>[saved,...p].slice(0,10))
          setLoading(false); setTip(''); return
        }
        setTip('HF failed — using fallback')
      } catch { setTip('HF timeout — using fallback') }
    }

    // Fallback — Mubert / Suno deep link
    const mubertGenre = genre || 'lofi'
    const mubertMood  = mood  || 'calm'
    const mubertUrl   = `https://mubert.com/render/tracks?genre=${encodeURIComponent(mubertGenre)}&mood=${encodeURIComponent(mubertMood)}&duration=${duration}`
    setResult({url:mubertUrl, type:'link'})
    setLoading(false); setTip('')
  }

  return (
    <div style={{paddingBottom:80}}>
      {!hfReady && (
        <div style={{padding:'10px 12px', background:'rgba(255,171,0,.05)', border:'1px solid rgba(255,171,0,.12)', borderRadius:10, marginBottom:16, fontSize:11, color:'#6a5020', lineHeight:1.7}}>
          🎵 <b>Better music:</b> Settings → API Keys → HuggingFace token daalo (free). Warna Mubert links milenge.
        </div>
      )}

      <div style={{marginBottom:14}}>
        <div style={C.label}>Genre</div>
        <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
          {MUSIC_GENRES.map(g => <Chip key={g.id} label={g.label} active={genre===g.id} onClick={()=>setGenre(genre===g.id?'':g.id)} color='#a78bfa'/>)}
        </div>
      </div>

      <div style={{marginBottom:14}}>
        <div style={C.label}>Mood</div>
        <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
          {MUSIC_MOODS.map(m => <Chip key={m.id} label={m.label} active={mood===m.id} onClick={()=>setMood(mood===m.id?'':m.id)} color='#00e676'/>)}
        </div>
      </div>

      <div style={{marginBottom:14}}>
        <div style={C.label}>Custom (optional)</div>
        <input value={custom} onChange={e=>setCustom(e.target.value)} placeholder="guitar, monsoon vibes, indian classical…" style={C.input}/>
      </div>

      <div style={{marginBottom:20}}>
        <div style={C.label}>Duration: {duration}s</div>
        <div style={{display:'flex', gap:6}}>
          {[5,10,15,20,30].map(d => <Chip key={d} label={`${d}s`} active={duration===d} onClick={()=>setDuration(d)} color='#a78bfa'/>)}
        </div>
      </div>

      <button onClick={generate} disabled={(!genre&&!mood&&!custom)||loading} style={C.btn('#a78bfa', (!genre&&!mood&&!custom)||loading)}>
        {loading ? <><Spinner color='#a78bfa'/> {tip||'Generating…'}</> : '🎵 Generate Music'}
      </button>

      {result && (
        <div style={{marginTop:16, padding:14, background:'rgba(167,139,250,.06)', border:'1px solid rgba(167,139,250,.15)', borderRadius:12}}>
          {result.type==='blob' ? (
            <>
              <div style={{fontSize:11, color:'#8a70d0', marginBottom:8}}>🎵 Track ready!</div>
              <audio src={result.url} controls style={{width:'100%', height:36}}/>
              <a href={result.url} download={`studio_music_${Date.now()}.wav`}
                style={{display:'block', marginTop:10, padding:'9px', borderRadius:10, background:'rgba(167,139,250,.1)', border:'1px solid rgba(167,139,250,.2)', color:'#a78bfa', fontSize:12, textAlign:'center', textDecoration:'none'}}>
                ⬇️ Download WAV
              </a>
            </>
          ) : (
            <>
              <div style={{fontSize:11, color:'#8a70d0', marginBottom:8}}>🔗 Mubert se suno (HF token nahi)</div>
              <a href={result.url} target="_blank" rel="noreferrer"
                style={{display:'block', padding:'11px', borderRadius:10, background:'rgba(167,139,250,.1)', border:'1px solid rgba(167,139,250,.2)', color:'#a78bfa', fontSize:13, textAlign:'center', textDecoration:'none'}}>
                🎵 Mubert mein open karo →
              </a>
              <div style={{fontSize:10, color:'var(--text-faint)', marginTop:8, textAlign:'center'}}>HuggingFace token daalo Settings mein for direct generation</div>
            </>
          )}
        </div>
      )}

      {history.filter(i=>i.type==='blob').length > 0 && (
        <div style={{marginTop:20}}>
          <div style={{fontSize:10, color:'var(--border)', marginBottom:10}}>Saved Tracks</div>
          {history.filter(i=>i.type==='blob'||i.puterPath).slice(0,6).map(item => (
            <MusicHistoryItem key={item.id} item={item}/>
          ))}
        </div>
      )}
    </div>
  )
}

// Music history item with Puter lazy load
function MusicHistoryItem({ item }: { item: any }) {
  const [src, setSrc] = useState<string|undefined>(item.url && !item.url.startsWith('blob:') ? item.url : undefined)
  const [loading, setLoading] = useState(false)
  const load = async () => {
    if (src) return
    if (!item.puterPath) return
    setLoading(true)
    const url = await loadFromPuter(item.puterPath).catch(()=>null)
    if(url) setSrc(url)
    setLoading(false)
  }
  return (
    <div style={{background:'rgba(255,255,255,.03)', borderRadius:10, padding:'10px 12px', marginBottom:7}}>
      <div style={{fontSize:11, color:'#a0c8e0', marginBottom:6}}>{item.prompt?.slice(0,40)} · {item.duration}s</div>
      {src ? (
        <audio src={src} controls style={{width:'100%', height:30}}/>
      ) : (
        <button onClick={load} disabled={loading} style={{width:'100%',padding:'6px',borderRadius:8,background:'rgba(0,229,255,.08)',border:'1px solid rgba(0,229,255,.15)',color:'#00e5ff',fontSize:11,cursor:'pointer'}}>
          {loading ? '⏳ Loading...' : '▶ Load from Cloud'}
        </button>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// 🎨  CANVAS / DRAW
// ════════════════════════════════════════════════════════════
function CanvasTab() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tool,     setTool]     = useState<'pen'|'eraser'|'line'|'rect'|'circle'>('pen')
  const [color,    setColor]    = useState('#00e5ff')
  const [size,     setSize]     = useState(4)
  const [drawing,  setDrawing]  = useState(false)
  const [saved,    setSaved]    = useState<StudioCanvas[]>([])
  const [name,     setName]     = useState('')
  const [bg,       setBg]       = useState('#090d18')
  const [history,  setHistory]  = useState<ImageData[]>([])
  const [hIdx,     setHIdx]     = useState(-1)
  const startPt = useRef<{x:number;y:number}|null>(null)
  const snap    = useRef<ImageData|null>(null)

  useEffect(() => {
    sdbAll('canvas').then(a=>setSaved(a.sort((x,y)=>y.timestamp-x.timestamp))).catch(()=>{})
    initCanvas()
  }, [])

  const initCanvas = () => {
    const c = canvasRef.current; if (!c) return
    const ctx = c.getContext('2d')!
    c.width  = c.offsetWidth || 360
    c.height = 320
    ctx.fillStyle = bg; ctx.fillRect(0,0,c.width,c.height)
  }

  const getCtx = () => canvasRef.current?.getContext('2d')

  const pushHistory = () => {
    const c = canvasRef.current; if (!c) return
    const ctx = getCtx()!
    const data = ctx.getImageData(0,0,c.width,c.height)
    setHistory(h => [...h.slice(0, hIdx+1), data])
    setHIdx(h => h + 1)
  }

  const undo = () => {
    if (hIdx <= 0) { initCanvas(); return }
    const ctx = getCtx()!
    ctx.putImageData(history[hIdx-1], 0, 0)
    setHIdx(h => h-1)
  }

  const getPt = (e: React.MouseEvent<HTMLCanvasElement>|React.TouchEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!.getBoundingClientRect()
    const ev = 'touches' in e ? e.touches[0] : e as any
    return { x: ev.clientX - c.left, y: ev.clientY - c.top }
  }

  const onStart = (e: any) => {
    e.preventDefault()
    pushHistory()
    const pt = getPt(e)
    startPt.current = pt
    const ctx = getCtx()!
    snap.current = ctx.getImageData(0,0, canvasRef.current!.width, canvasRef.current!.height)
    setDrawing(true)
    if (tool==='pen'||tool==='eraser') {
      ctx.beginPath(); ctx.moveTo(pt.x, pt.y)
    }
  }

  const onMove = (e: any) => {
    e.preventDefault()
    if (!drawing) return
    const pt = getPt(e)
    const ctx = getCtx()!
    ctx.lineWidth = size
    ctx.lineCap   = 'round'
    ctx.lineJoin  = 'round'
    if (tool==='pen')   { ctx.globalCompositeOperation='source-over'; ctx.strokeStyle=color; ctx.lineTo(pt.x,pt.y); ctx.stroke() }
    if (tool==='eraser'){ ctx.globalCompositeOperation='destination-out'; ctx.strokeStyle='rgba(0,0,0,1)'; ctx.lineTo(pt.x,pt.y); ctx.stroke() }
    if ((tool==='line'||tool==='rect'||tool==='circle') && snap.current) {
      ctx.putImageData(snap.current, 0, 0)
      ctx.globalCompositeOperation='source-over'; ctx.strokeStyle=color; ctx.lineWidth=size
      const sx = startPt.current!.x, sy = startPt.current!.y
      ctx.beginPath()
      if (tool==='line')   { ctx.moveTo(sx,sy); ctx.lineTo(pt.x,pt.y) }
      if (tool==='rect')   { ctx.strokeRect(sx,sy,pt.x-sx,pt.y-sy) }
      if (tool==='circle') { const r=Math.sqrt((pt.x-sx)**2+(pt.y-sy)**2); ctx.arc(sx,sy,r,0,Math.PI*2) }
      ctx.stroke()
    }
  }

  const onEnd = (e: any) => { e.preventDefault(); setDrawing(false); startPt.current=null; snap.current=null }

  const clearCanvas = () => {
    const c=canvasRef.current; if(!c) return
    const ctx=getCtx()!
    ctx.globalCompositeOperation='source-over'
    ctx.fillStyle=bg; ctx.fillRect(0,0,c.width,c.height)
  }

  const saveCanvas = async () => {
    const cvs = canvasRef.current; if(!cvs) return
    const dataUrl = cvs.toDataURL('image/png')
    const id = `canvas_${Date.now()}`
    const fname = name||`Drawing ${new Date().toLocaleString('hi-IN',{hour:'2-digit',minute:'2-digit'})}`
    // Thumbnail (120x120 for grid)
    const thumbCanvas = document.createElement('canvas')
    thumbCanvas.width=120; thumbCanvas.height=120
    thumbCanvas.getContext('2d')!.drawImage(cvs, 0, 0, 120, 120)
    const thumb = thumbCanvas.toDataURL('image/jpeg', 0.6)
    // Save PNG to Puter (user's cloud — persists forever)
    const puterPath = await saveCanvasToPuter(dataUrl, `${id}.png`).catch(()=>null)
    // IndexedDB: metadata + thumbnail ONLY (not full dataUrl — saves ~1MB per drawing)
    const item: StudioCanvas = { id, name:fname, puterPath:puterPath||undefined, thumb, timestamp:Date.now() }
    await sdbPut('canvas', item)
    setSaved((p:any[])=>[item,...p]); setName('')
    // Download
    const a=document.createElement('a'); a.href=dataUrl; a.download=`${fname}.png`; a.click()
  }

  const COLORS = ['#00e5ff','#a78bfa','#ff4444','#00e676','#ffab00','#ff69b4','#ffffff','#000000','#ff6b35','#4ecdc4']
  const TOOLS = [
    {id:'pen',label:'✏️ Pen'},{id:'eraser',label:'🗑 Erase'},{id:'line',label:'╱ Line'},{id:'rect',label:'▭ Rect'},{id:'circle',label:'◯ Circle'}
  ]

  return (
    <div style={{paddingBottom:80}}>
      {/* Toolbar */}
      <div style={{display:'flex', gap:6, marginBottom:10, flexWrap:'wrap'}}>
        {TOOLS.map(t => <Chip key={t.id} label={t.label} active={tool===t.id} onClick={()=>setTool(t.id as any)}/>)}
      </div>

      {/* Colors + size */}
      <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:10}}>
        <div style={{display:'flex', gap:5, flexWrap:'wrap'}}>
          {COLORS.map(c => (
            <button key={c} onClick={()=>setColor(c)}
              style={{width:22, height:22, borderRadius:'50%', background:c, border:`2px solid ${color===c?'#fff':'transparent'}`, cursor:'pointer', flexShrink:0}}/>
          ))}
          <input type="color" value={color} onChange={e=>setColor(e.target.value)}
            style={{width:22, height:22, borderRadius:'50%', border:'none', padding:0, cursor:'pointer', background:'transparent'}}/>
        </div>
        <input type="range" min="1" max="30" value={size} onChange={e=>setSize(parseInt(e.target.value))}
          style={{flex:1, accentColor:color}}/>
        <span style={{fontSize:10, color:'var(--border)', width:20}}>{size}px</span>
      </div>

      {/* BG color */}
      <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:10}}>
        <span style={{fontSize:10, color:'var(--border)'}}>BG:</span>
        {['#090d18','#ffffff','#1a1a2e','#0d1b2a'].map(c => (
          <button key={c} onClick={()=>{setBg(c); const ctx=getCtx(); if(ctx){ctx.fillStyle=c;ctx.globalCompositeOperation='destination-over';ctx.fillRect(0,0,canvasRef.current!.width,canvasRef.current!.height);ctx.globalCompositeOperation='source-over'}}}
            style={{width:20,height:20,borderRadius:5,background:c,border:`1px solid ${bg===c?'#00e5ff':'rgba(255,255,255,.1)'}`,cursor:'pointer'}}/>
        ))}
        <button onClick={undo} style={{...C.chip(false), padding:'6px 12px', fontSize:11}}>↩ Undo</button>
        <button onClick={clearCanvas} style={{...C.chip(false,'#ff4444'), padding:'6px 12px', fontSize:11}}>🗑 Clear</button>
      </div>

      {/* Canvas */}
      <div style={{borderRadius:12, overflow:'hidden', border:'1px solid rgba(255,255,255,.08)', marginBottom:12, touchAction:'none'}}>
        <canvas ref={canvasRef} style={{width:'100%', height:320, display:'block', cursor: tool==='eraser'?'cell':'crosshair'}}
          onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
          onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}/>
      </div>

      {/* Save */}
      <div style={{display:'flex', gap:8}}>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Drawing ka naam (optional)…"
          style={{...C.input, flex:1, padding:'9px 12px', fontSize:12}}/>
        <button onClick={saveCanvas}
          style={{...C.btn('#00e5ff'), width:'auto', padding:'9px 16px', borderRadius:11, flexShrink:0}}>
          💾 Save
        </button>
      </div>

      {/* Saved canvases */}
      {saved.length > 0 && (
        <div style={{marginTop:16}}>
          <div style={{fontSize:10, color:'var(--border)', marginBottom:8}}>Saved Drawings ({saved.length})</div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
            {saved.slice(0,6).map(c => (
              <div key={c.id} style={{borderRadius:10, overflow:'hidden', border:'1px solid rgba(255,255,255,.06)', position:'relative'}}>
                <img src={c.dataUrl} alt={c.name} style={{width:'100%', aspectRatio:'4/3', objectFit:'cover', display:'block'}}/>
                <div style={{padding:'5px 8px', background:'rgba(0,0,0,.7)'}}>
                  <div style={{fontSize:10, color:'#a0c8e0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{c.name}</div>
                </div>
                <button onClick={() => sdbDel('canvas',c.id).then(()=>setSaved(p=>p.filter(x=>x.id!==c.id)))}
                  style={{position:'absolute', top:4, right:4, background:'rgba(255,0,0,.6)', border:'none', color:'#fff', fontSize:12, width:20, height:20, borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// MAIN STUDIO PAGE
// ════════════════════════════════════════════════════════════
type StudioTab = 'image' | 'gallery' | 'voice' | 'music' | 'canvas'

export default function StudioPage() {
  const [tab,        setTab]       = useState<StudioTab>('image')
  const [galleryKey, setGalleryKey]= useState(0)

  const tabs: { id: StudioTab; icon: string; label: string }[] = [
    { id:'image',   icon:'🎨', label:'Image'   },
    { id:'gallery', icon:'🖼️', label:'Gallery'  },
    { id:'voice',   icon:'🎙️', label:'Voice'   },
    { id:'music',   icon:'🎵', label:'Music'   },
    { id:'canvas',  icon:'✏️', label:'Canvas'  },
  ]

  return (
    <div style={{position:'fixed', inset:0, display:'flex', flexDirection:'column', background:'#090d18', color:'var(--text)', fontFamily:"'Inter',sans-serif"}}>
      <div className="bg-grid"/>

      {/* Header */}
      <header style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,.05)', background:'rgba(9,13,24,.97)', flexShrink:0, zIndex:10}}>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <div style={{width:28, height:28, borderRadius:8, background:'linear-gradient(135deg,rgba(167,139,250,.2),rgba(0,229,255,.1))', border:'1px solid rgba(167,139,250,.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14}}>🎨</div>
          <div>
            <div style={{fontSize:12, fontWeight:700, color:'var(--text)', letterSpacing:2, fontFamily:"'Space Mono',monospace"}}>STUDIO</div>
            <div style={{fontSize:8, color:'var(--text-faint)', letterSpacing:1}}>CREATE · SAVE · SHARE</div>
          </div>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:6}}>
          <a href="/canva" style={{padding:'5px 10px', borderRadius:8, background:'rgba(139,92,246,.15)', border:'1px solid rgba(139,92,246,.3)', color:'#c4b5fd', fontSize:10, fontWeight:700, textDecoration:'none', display:'flex', alignItems:'center', gap:4}}>
            🎨 Canva
          </a>
          <div style={{fontSize:9, color:'#1a3050', fontFamily:"'Space Mono',monospace"}}>JARVIS</div>
        </div>
      </header>

      {/* Inner tabs */}
      <div style={{display:'flex', borderBottom:'1px solid rgba(255,255,255,.04)', flexShrink:0, background:'rgba(9,13,24,.96)', overflowX:'auto'}}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{flex:1, minWidth:60, padding:'9px 0', background:'transparent', border:'none', borderBottom:`2px solid ${tab===t.id?'#a78bfa':'transparent'}`, color:tab===t.id?'#a78bfa':'var(--text-faint)', fontSize:10, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:2, transition:'all .15s', flexShrink:0}}>
            <span style={{fontSize:16}}>{t.icon}</span>
            <span style={{letterSpacing:.5}}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{flex:1, overflowY:'auto', padding:'16px 14px', position:'relative', zIndex:1}}>
        {tab==='image'   && <ImageTab   onSaved={() => setGalleryKey(k => k+1)}/>}
        {tab==='gallery' && <GalleryTab refreshKey={galleryKey}/>}
        {tab==='voice'   && <VoiceTab/>}
        {tab==='music'   && <MusicTab/>}
        {tab==='canvas'  && <CanvasTab/>}
      </div>

      <BottomNav active="studio"/>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg) } }
        .bg-grid { position:absolute;inset:0;background-image:linear-gradient(rgba(167,139,250,.012) 1px,transparent 1px),linear-gradient(90deg,rgba(167,139,250,.012) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;z-index:0 }
        ::-webkit-scrollbar { width:3px } ::-webkit-scrollbar-thumb { background:rgba(167,139,250,.15);border-radius:2px }
      `}</style>
    </div>
  )
}
