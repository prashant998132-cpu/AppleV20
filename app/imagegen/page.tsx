'use client'
// app/imagegen/page.tsx — JARVIS AI Image Studio
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initTheme } from '../../lib/theme'

const MODELS = [
  { id:'flux', label:'Flux', desc:'Best quality', icon:'⚡' },
  { id:'flux-realism', label:'Flux Realism', desc:'Photorealistic', icon:'📷' },
  { id:'turbo', label:'Turbo', desc:'Fastest', icon:'🚀' },
  { id:'gptimage', label:'GPT Image', desc:'OpenAI DALL-E', icon:'🎨' },
  { id:'stable-diffusion', label:'Stable Diffusion', desc:'Open source', icon:'🌀' },
]

const STYLES = [
  'Photorealistic', 'Anime', 'Oil painting', 'Watercolor', 'Pencil sketch',
  'Cyberpunk', 'Studio Ghibli', 'Comic book', 'Minimalist', '3D render',
  'Pixel art', 'Vintage poster', 'Surrealist', 'Abstract', 'Indian art'
]

const RATIO_SIZES: Record<string,[number,number]> = {
  '1:1':[512,512], '16:9':[1024,576], '9:16':[576,1024],
  '4:3':[768,576], '3:4':[576,768], '3:2':[768,512]
}

interface GenImage { url:string; prompt:string; model:string; time:string; w:number; h:number }

export default function ImageGenPage() {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [neg, setNeg] = useState('')
  const [model, setModel] = useState('flux')
  const [style, setStyle] = useState('')
  const [ratio, setRatio] = useState('1:1')
  const [loading, setLoading] = useState(false)
  const [current, setCurrent] = useState<GenImage|null>(null)
  const [gallery, setGallery] = useState<GenImage[]>([])
  const [enhance, setEnhance] = useState(true)
  const [seed, setSeed] = useState(-1)

  useEffect(() => {
    initTheme()
    try { setGallery(JSON.parse(localStorage.getItem('jarvis_imagegen')||'[]')) } catch {}
  }, [])

  const generate = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    const [w, h] = RATIO_SIZES[ratio]
    const fullPrompt = style ? `${prompt}, ${style} style${neg?`, negative: ${neg}`:''}` : prompt
    const s = seed === -1 ? Math.floor(Math.random()*99999) : seed
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=${w}&height=${h}&model=${model}&nologo=true&seed=${s}&enhance=${enhance}`
    const img: GenImage = { url, prompt: fullPrompt, model, time: new Date().toLocaleTimeString('hi-IN',{hour:'2-digit',minute:'2-digit'}), w, h }
    // Preload
    const image = new Image()
    image.onload = () => {
      setCurrent(img)
      const g = [img,...gallery.slice(0,19)]
      setGallery(g); localStorage.setItem('jarvis_imagegen', JSON.stringify(g))
      setLoading(false)
    }
    image.onerror = () => { setCurrent(img); setLoading(false) }
    image.src = url
  }

  const download = (img: GenImage) => {
    const a = document.createElement('a')
    a.href = img.url; a.download = `jarvis-${Date.now()}.jpg`; a.target = '_blank'; a.click()
  }

  const PROMPTS = ['Beautiful sunset over Rewa lake, golden hour', 'Cyberpunk Delhi 2080 neon lights rain', 'Lord Shiva cosmic dance universe background', 'Indian village morning fog river', 'Abstract mandala art colorful digital']

  return (
    <div style={{minHeight:'100dvh',background:'var(--bg)',color:'var(--text)',fontFamily:"'Inter',sans-serif"}}>
      <div className="bg-grid"/>
      <div style={{position:'sticky',top:0,zIndex:50,background:'var(--header)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--border)',padding:'10px 16px',display:'flex',alignItems:'center',gap:8}}>
        <button onClick={()=>router.push('/')} style={{background:'var(--accent-bg)',border:'1px solid var(--border-a)',borderRadius:8,color:'var(--accent)',fontSize:14,fontWeight:800,width:28,height:28,fontFamily:'monospace'}}>J</button>
        <div style={{flex:1}}><div style={{fontSize:15,fontWeight:700}}>🎨 AI Image Studio</div><div style={{fontSize:10,color:'var(--text-3)'}}>Pollinations · Free · No key</div></div>
      </div>

      <div style={{padding:'12px 14px 80px'}}>
        {/* Prompt */}
        <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Kya banana hai? Describe karo..." rows={3}
          style={{width:'100%',background:'var(--bg-input)',border:'1px solid var(--border-a)',borderRadius:12,padding:'12px',color:'var(--text)',fontSize:13,resize:'none',outline:'none',fontFamily:'inherit',marginBottom:8}}/>

        {/* Inspiration prompts */}
        <div style={{display:'flex',gap:5,overflowX:'auto',marginBottom:10}} className="no-scroll">
          {PROMPTS.map(p=>(
            <button key={p} onClick={()=>setPrompt(p)} style={{flexShrink:0,padding:'4px 10px',borderRadius:20,fontSize:10,background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',color:'var(--text-3)',cursor:'pointer',whiteSpace:'nowrap'}}>✨ {p.slice(0,25)}...</button>
          ))}
        </div>

        {/* Model selector */}
        <div style={{marginBottom:10}}>
          <div style={{fontSize:10,color:'var(--text-3)',marginBottom:6,fontWeight:600}}>MODEL</div>
          <div style={{display:'flex',gap:6,overflowX:'auto'}} className="no-scroll">
            {MODELS.map(m=>(
              <button key={m.id} onClick={()=>setModel(m.id)} style={{flexShrink:0,padding:'6px 12px',borderRadius:10,fontSize:11,background:model===m.id?'var(--accent-bg)':'rgba(255,255,255,.04)',border:`1px solid ${model===m.id?'var(--border-a)':'var(--border)'}`,color:model===m.id?'var(--accent)':'var(--text-3)',cursor:'pointer',textAlign:'left'}}>
                <div style={{fontWeight:700}}>{m.icon} {m.label}</div>
                <div style={{fontSize:9,marginTop:1}}>{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Style + Ratio */}
        <div style={{display:'flex',gap:8,marginBottom:10}}>
          <div style={{flex:1}}>
            <div style={{fontSize:10,color:'var(--text-3)',marginBottom:4,fontWeight:600}}>STYLE</div>
            <select value={style} onChange={e=>setStyle(e.target.value)} style={{width:'100%',background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:8,padding:'8px',color:'var(--text)',fontSize:12}}>
              <option value=''>None</option>
              {STYLES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <div style={{fontSize:10,color:'var(--text-3)',marginBottom:4,fontWeight:600}}>RATIO</div>
            <select value={ratio} onChange={e=>setRatio(e.target.value)} style={{background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:8,padding:'8px',color:'var(--text)',fontSize:12}}>
              {Object.keys(RATIO_SIZES).map(r=><option key={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {/* Options row */}
        <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center'}}>
          <label style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--text-3)',cursor:'pointer'}}>
            <input type="checkbox" checked={enhance} onChange={e=>setEnhance(e.target.checked)} style={{width:14,height:14}}/>
            Auto-enhance
          </label>
          <div style={{flex:1}}/>
          <input value={seed===-1?'':String(seed)} onChange={e=>setSeed(e.target.value?Number(e.target.value):-1)} placeholder="Seed (optional)" style={{width:120,background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:8,padding:'6px 10px',color:'var(--text)',fontSize:11}}/>
          <button onClick={()=>setSeed(Math.floor(Math.random()*99999))} style={{padding:'6px',background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:8,cursor:'pointer',fontSize:13}}>🎲</button>
        </div>

        <button onClick={generate} disabled={loading||!prompt.trim()} style={{width:'100%',padding:'14px',background:loading?'rgba(255,255,255,.05)':'var(--accent)',color:loading?'var(--text-3)':'#000',border:'none',borderRadius:12,fontWeight:800,fontSize:15,cursor:loading?'not-allowed':'pointer',marginBottom:16}}>
          {loading ? '🎨 Creating magic...' : '✨ Generate Image'}
        </button>

        {/* Loading placeholder */}
        {loading&&<div className="skeleton" style={{width:'100%',paddingBottom:'100%',borderRadius:16,marginBottom:16}}/>}

        {/* Current image */}
        {current&&!loading&&(
          <div style={{marginBottom:16,borderRadius:16,overflow:'hidden',border:'1px solid var(--border-a)'}}>
            <img src={current.url} alt={current.prompt} style={{width:'100%',display:'block'}} onError={e=>(e.currentTarget.alt='Failed to load')}/>
            <div style={{padding:'10px 12px',background:'var(--bg-card)',display:'flex',alignItems:'center',gap:8}}>
              <div style={{flex:1,fontSize:10,color:'var(--text-3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{current.prompt.slice(0,60)}</div>
              <button onClick={()=>download(current)} style={{padding:'5px 12px',background:'var(--accent-bg)',border:'1px solid var(--border-a)',borderRadius:8,color:'var(--accent)',fontSize:11,cursor:'pointer'}}>⬇ Save</button>
              <button onClick={()=>navigator.clipboard.writeText(current.url)} style={{padding:'5px 10px',background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text-3)',fontSize:11,cursor:'pointer'}}>🔗</button>
            </div>
          </div>
        )}

        {/* Gallery */}
        {gallery.length>0&&(
          <>
            <div style={{fontSize:11,color:'var(--text-3)',marginBottom:8,fontWeight:600}}>GALLERY ({gallery.length})</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
              {gallery.map((img,i)=>(
                <div key={i} onClick={()=>setCurrent(img)} style={{borderRadius:10,overflow:'hidden',cursor:'pointer',border:`1px solid ${current?.url===img.url?'var(--accent)':'var(--border)'}`,aspectRatio:'1',position:'relative'}}>
                  <img src={img.url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
                  <div style={{position:'absolute',bottom:0,left:0,right:0,background:'rgba(0,0,0,.7)',padding:'3px 5px',fontSize:8,color:'rgba(255,255,255,.7)'}}>{img.model} · {img.time}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
