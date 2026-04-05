'use client'
// app/news/page.tsx — JARVIS India News Hub
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initTheme } from '../../lib/theme'

interface Article { title:string; desc:string; url:string; source:string; time:string; img?:string; category:string }

const CATS = ['Top','India','Tech','Business','Sports','Science','Entertainment','World']
const CAT_EMOJIS: Record<string,string> = { Top:'🗞️', India:'🇮🇳', Tech:'💻', Business:'💰', Sports:'🏏', Science:'🔬', Entertainment:'🎬', World:'🌍' }

async function fetchNews(cat:string): Promise<Article[]> {
  const catMap: Record<string,string> = { Top:'top', India:'india', Tech:'technology', Business:'business', Sports:'sports', Science:'science', Entertainment:'entertainment', World:'world' }
  try {
    // Try GNews
    const query = cat==='India'?'india&country=in':cat==='Top'?'':catMap[cat]
    const isCategory = !['India','Top'].includes(cat)
    const url = isCategory
      ? `https://gnews.io/api/v4/top-headlines?category=${catMap[cat]}&country=in&lang=en&max=10&token=free`
      : cat==='India'
        ? `https://gnews.io/api/v4/search?q=india&country=in&lang=en&max=10&token=free`
        : `https://gnews.io/api/v4/top-headlines?country=in&lang=en&max=10&token=free`
    const r = await fetch(url, {signal:AbortSignal.timeout(8000)})
    if(r.ok) {
      const d = await r.json()
      return (d.articles||[]).map((a:any)=>({
        title:a.title, desc:a.description||'', url:a.url,
        source:a.source?.name||'News', time:timeAgo(new Date(a.publishedAt)),
        img:a.image, category:cat
      }))
    }
  } catch {}
  // Fallback: NewsData.io
  try {
    const r = await fetch(`https://newsdata.io/api/1/latest?country=in&language=en${cat!=='Top'&&cat!=='India'?`&category=${catMap[cat]}`:''}`, {signal:AbortSignal.timeout(8000)})
    if(r.ok) {
      const d = await r.json()
      return (d.results||[]).slice(0,10).map((a:any)=>({
        title:a.title, desc:a.description||'', url:a.link,
        source:a.source_id||'News', time:timeAgo(new Date(a.pubDate)),
        img:a.image_url, category:cat
      }))
    }
  } catch {}
  return []
}

function timeAgo(date:Date):string {
  const diff = Date.now()-date.getTime()
  if(diff<3600000) return `${Math.round(diff/60000)}m ago`
  if(diff<86400000) return `${Math.round(diff/3600000)}h ago`
  return `${Math.round(diff/86400000)}d ago`
}

export default function NewsPage() {
  const router = useRouter()
  const [cat, setCat] = useState('Top')
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState<Article[]>([])
  const [showSaved, setShowSaved] = useState(false)

  useEffect(()=>{
    initTheme()
    try { setSaved(JSON.parse(localStorage.getItem('jarvis_news_saved')||'[]')) } catch {}
  },[])

  useEffect(()=>{
    setLoading(true); setArticles([])
    fetchNews(cat).then(d=>{ setArticles(d); setLoading(false) })
  },[cat])

  const toggleSave = (a:Article) => {
    const exists = saved.some(s=>s.url===a.url)
    const newSaved = exists ? saved.filter(s=>s.url!==a.url) : [a,...saved]
    setSaved(newSaved); localStorage.setItem('jarvis_news_saved',JSON.stringify(newSaved))
  }
  const isSaved = (url:string) => saved.some(s=>s.url===url)

  const display = showSaved ? saved : articles

  return (
    <div style={{minHeight:'100dvh',background:'var(--bg)',color:'var(--text)',fontFamily:"'Inter',sans-serif"}}>
      <div className="bg-grid"/>
      <div style={{position:'sticky',top:0,zIndex:50,background:'var(--header)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--border)',padding:'10px 16px',display:'flex',alignItems:'center',gap:8}}>
        <button onClick={()=>router.push('/')} style={{background:'var(--accent-bg)',border:'1px solid var(--border-a)',borderRadius:8,color:'var(--accent)',fontSize:14,fontWeight:800,width:28,height:28,fontFamily:'monospace'}}>J</button>
        <div style={{flex:1}}><div style={{fontSize:15,fontWeight:700}}>📰 India News</div><div style={{fontSize:10,color:'var(--text-3)'}}>Real-time · English</div></div>
        <button onClick={()=>setShowSaved(p=>!p)} style={{fontSize:11,padding:'4px 10px',borderRadius:8,background:showSaved?'var(--accent-bg)':'transparent',border:`1px solid ${showSaved?'var(--border-a)':'var(--border)'}`,color:showSaved?'var(--accent)':'var(--text-3)',cursor:'pointer'}}>🔖 Saved {saved.length>0?`(${saved.length})`:''}</button>
      </div>

      {!showSaved&&(
        <div style={{display:'flex',gap:6,padding:'10px 14px',overflowX:'auto',borderBottom:'1px solid var(--border)'}} className="no-scroll">
          {CATS.map(c=>(
            <button key={c} onClick={()=>setCat(c)} style={{padding:'6px 12px',borderRadius:20,fontSize:11,fontWeight:600,border:'1px solid',borderColor:cat===c?'var(--accent)':'var(--border)',background:cat===c?'var(--accent-bg)':'transparent',color:cat===c?'var(--accent)':'var(--text-3)',cursor:'pointer',whiteSpace:'nowrap'}}>
              {CAT_EMOJIS[c]} {c}
            </button>
          ))}
        </div>
      )}

      <div style={{padding:'10px 14px 80px'}}>
        {loading&&<div style={{textAlign:'center',padding:'40px 0',color:'var(--text-3)'}}>📰 News load ho rahi hai...</div>}
        {!loading&&display.length===0&&<div style={{textAlign:'center',padding:'40px 0',color:'var(--text-3)'}}>{showSaved?'Koi saved article nahi.':'News nahi mili. Internet check karo.'}</div>}
        {display.map((a,i)=>(
          <div key={i} style={{marginBottom:12,background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,overflow:'hidden'}}>
            {a.img&&<img src={a.img} alt="" style={{width:'100%',height:160,objectFit:'cover',display:'block'}} onError={e=>(e.currentTarget.style.display='none')}/>}
            <div style={{padding:'12px'}}>
              <a href={a.url} target="_blank" rel="noopener" style={{textDecoration:'none'}}>
                <div style={{fontSize:14,fontWeight:700,color:'var(--text)',lineHeight:1.4,marginBottom:6}}>{a.title}</div>
              </a>
              {a.desc&&<div style={{fontSize:11,color:'var(--text-3)',lineHeight:1.5,marginBottom:8,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{a.desc}</div>}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span style={{fontSize:9,color:'var(--accent)',fontWeight:600,background:'var(--accent-bg)',padding:'2px 6px',borderRadius:4}}>{a.source}</span>
                  <span style={{fontSize:9,color:'var(--text-4)'}}>{a.time}</span>
                </div>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>toggleSave(a)} style={{background:'none',border:'none',fontSize:15,cursor:'pointer',color:isSaved(a.url)?'#f59e0b':'var(--text-4)'}}>{isSaved(a.url)?'🔖':'🔖'}</button>
                  <button onClick={()=>navigator.share?.({title:a.title,url:a.url}).catch(()=>{navigator.clipboard.writeText(a.url)})} style={{background:'none',border:'none',fontSize:15,cursor:'pointer',color:'var(--text-4)'}}>🔗</button>
                  <a href={a.url} target="_blank" rel="noopener" style={{fontSize:11,color:'var(--accent)',textDecoration:'none',padding:'3px 8px',border:'1px solid var(--border-a)',borderRadius:6}}>Read →</a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
