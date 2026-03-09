'use client'
// app/apps/page.tsx — JARVIS Mega Apps Hub v2
// 150+ connected apps · 20 categories · Real API + Deep links

import { useState, useMemo, useEffect } from 'react'
import BottomNav from '../../components/shared/BottomNav'
import { MEGA_APPS, ALL_CATEGORIES, CATEGORY_EMOJI, searchMegaApps, MEGA_STATS, type MegaApp, type MegaCategory } from '../../lib/integrations/mega'

const BG='#05080f', CARD='rgba(255,255,255,.04)', BORDER='rgba(255,255,255,.07)', ACCENT='#00e5ff', DIM='#3a5570'

const CAT_COLORS: Record<string,string> = {
  'AI Tools':'#a78bfa','Design & Art':'#f472b6','Code & Dev':'#34d399','Media & Music':'#f87171',
  'Photos & Video':'#e879f9','Docs & Notes':'#60a5fa','Productivity':'#fbbf24','Communication':'#4ade80',
  'India':'#fb923c','Education':'#818cf8','Finance':'#22d3ee','Cloud & Storage':'#38bdf8',
  'Social Media':'#f472b6','Entertainment':'#f97316','Developer Tools':'#86efac',
  'Security & Privacy':'#a8a29e','PDF & Files':'#fca5a5','Health & Fitness':'#6ee7b7',
  'Shopping':'#fde68a','Travel':'#7dd3fc',
}

const PINNED_KEY='jarvis_pinned_v2', RECENT_KEY='jarvis_recent_v2'
const getPinned=():string[]=>{try{return JSON.parse(localStorage.getItem(PINNED_KEY)||'[]')}catch{return[]}}
const savePinned=(ids:string[])=>{try{localStorage.setItem(PINNED_KEY,JSON.stringify(ids))}catch{}}
const getRecent=():string[]=>{try{return JSON.parse(localStorage.getItem(RECENT_KEY)||'[]')}catch{return[]}}
const addRecent=(id:string)=>{try{const r=getRecent().filter(x=>x!==id);localStorage.setItem(RECENT_KEY,JSON.stringify([id,...r].slice(0,8)))}catch{}}

function launchApp(app:MegaApp,actionId:string,q?:string){
  const a=app.actions.find(x=>x.id===actionId)||app.actions[0]
  if(a){window.open(a.url(q),'_blank','noopener');addRecent(app.id)}
}

function AppCard({app,pinned,onPin,q}:{app:MegaApp;pinned:boolean;onPin:(id:string)=>void;q?:string}){
  const [exp,setExp]=useState(false)
  const c=CAT_COLORS[app.category]||ACCENT
  return(
    <div style={{padding:'10px 12px',borderRadius:12,background:CARD,border:`1px solid ${BORDER}`,marginBottom:6}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
        <span style={{fontSize:22,flexShrink:0}}>{app.emoji}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,fontWeight:700,color:'#e8f4ff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{app.name}</div>
          <div style={{fontSize:9,color:DIM,marginTop:1}}>{app.desc}</div>
        </div>
        <div style={{display:'flex',gap:4,flexShrink:0,alignItems:'center'}}>
          {app.hasRealApi&&<span style={{fontSize:8,padding:'2px 4px',borderRadius:4,background:'rgba(34,197,94,.1)',color:'#22c55e',border:'1px solid rgba(34,197,94,.2)'}}>API</span>}
          {app.india&&<span style={{fontSize:9}}>🇮🇳</span>}
          <button onClick={()=>onPin(app.id)} style={{background:'none',border:'none',fontSize:12,cursor:'pointer',color:pinned?'#fbbf24':DIM}}>{pinned?'⭐':'☆'}</button>
        </div>
      </div>
      <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
        {app.actions.slice(0,exp?undefined:3).map(a=>(
          <button key={a.id} onClick={()=>launchApp(app,a.id,q)}
            style={{padding:'4px 8px',borderRadius:6,background:'rgba(255,255,255,.04)',border:`1px solid ${BORDER}`,color:'#a0b8d0',fontSize:9.5,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
            <span>{a.icon}</span><span>{a.label}</span>
          </button>
        ))}
        {!exp&&app.actions.length>3&&(
          <button onClick={()=>setExp(true)} style={{padding:'4px 8px',borderRadius:6,background:'none',border:`1px dashed ${BORDER}`,color:DIM,fontSize:9,cursor:'pointer'}}>+{app.actions.length-3}</button>
        )}
        {exp&&<button onClick={()=>setExp(false)} style={{padding:'4px 8px',borderRadius:6,background:'none',border:`1px dashed ${BORDER}`,color:DIM,fontSize:9,cursor:'pointer'}}>▲</button>}
      </div>
    </div>
  )
}

export default function AppsPage(){
  const [search,setSearch]=useState('')
  const [cat,setCat]=useState<MegaCategory|'All'|'Pinned'|'Recent'|'India'>('All')
  const [pinned,setPinnedState]=useState<string[]>([])
  const [recent,setRecentState]=useState<string[]>([])

  useEffect(()=>{
    setPinnedState(getPinned()); setRecentState(getRecent())
    const t=setInterval(()=>setRecentState(getRecent()),2000)
    return()=>clearInterval(t)
  },[])

  const togglePin=(id:string)=>{
    const next=pinned.includes(id)?pinned.filter(x=>x!==id):[id,...pinned]
    setPinnedState(next); savePinned(next)
  }

  const apps=useMemo(()=>{
    if(search.trim().length>1) return searchMegaApps(search.trim(),40)
    if(cat==='Pinned') return pinned.map(id=>MEGA_APPS.find(a=>a.id===id)).filter(Boolean) as MegaApp[]
    if(cat==='Recent') return recent.map(id=>MEGA_APPS.find(a=>a.id===id)).filter(Boolean) as MegaApp[]
    if(cat==='India') return MEGA_APPS.filter(a=>a.india)
    if(cat==='All') return MEGA_APPS
    return MEGA_APPS.filter(a=>a.category===cat)
  },[search,cat,pinned,recent])

  return(
    <div style={{minHeight:'100vh',background:BG,color:'#e8f4ff',fontFamily:"'Noto Sans',system-ui,sans-serif",maxWidth:480,margin:'0 auto',display:'flex',flexDirection:'column'}}>

      {/* Header */}
      <header style={{padding:'12px 14px 8px',borderBottom:`1px solid ${BORDER}`,background:BG,position:'sticky',top:0,zIndex:20}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
          <div style={{width:34,height:34,borderRadius:10,background:'rgba(0,229,255,.1)',border:'1px solid rgba(0,229,255,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17}}>🚀</div>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:800,color:ACCENT}}>Apps Hub</div>
            <div style={{fontSize:9,color:DIM}}>{MEGA_STATS.total} apps · {MEGA_STATS.totalActions} actions · {MEGA_STATS.withApi} real APIs</div>
          </div>
          <div style={{display:'flex',gap:6}}>
            <a href="/india" style={{padding:'6px 10px',borderRadius:8,background:'rgba(0,229,255,.06)',border:`1px solid rgba(0,229,255,.15)`,color:ACCENT,fontSize:10,textDecoration:'none',display:'flex',alignItems:'center',gap:4}}>🇮🇳 India</a>
            <a href="/study" style={{padding:'6px 10px',borderRadius:8,background:'rgba(167,139,250,.06)',border:`1px solid rgba(167,139,250,.15)`,color:'#a78bfa',fontSize:10,textDecoration:'none',display:'flex',alignItems:'center',gap:4}}>📚 Study</a>
          </div>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search apps, actions..."
          style={{width:'100%',padding:'8px 12px',borderRadius:10,border:`1px solid ${search?'rgba(0,229,255,.3)':BORDER}`,background:'rgba(255,255,255,.03)',color:'#e8f4ff',fontSize:12,outline:'none',boxSizing:'border-box',marginBottom:8}}/>
        <div style={{display:'flex',gap:4,overflowX:'auto',paddingBottom:2}}>
          {(['All','Pinned','Recent','India'] as const).map(n=>(
            <button key={n} onClick={()=>{setCat(n);setSearch('')}}
              style={{flexShrink:0,padding:'5px 10px',borderRadius:8,border:`1px solid ${cat===n?ACCENT+'50':BORDER}`,background:cat===n?'rgba(0,229,255,.08)':CARD,color:cat===n?ACCENT:DIM,fontSize:10,cursor:'pointer'}}>
              {n==='India'?'🇮🇳':n==='Pinned'?'⭐':n==='Recent'?'🕐':'⚡'} {n}
            </button>
          ))}
        </div>
      </header>

      {/* Body: sidebar + apps */}
      <div style={{flex:1,display:'flex',overflow:'hidden'}}>

        {/* Category rail */}
        {!search&&(
          <div style={{width:64,flexShrink:0,overflowY:'auto',borderRight:`1px solid ${BORDER}`,padding:'6px 3px'}}>
            {ALL_CATEGORIES.map(c=>{
              const cc=CAT_COLORS[c]||ACCENT
              const active=cat===c
              return(
                <button key={c} onClick={()=>{setCat(c);setSearch('')}}
                  style={{width:'100%',padding:'7px 2px',borderRadius:8,border:`1px solid ${active?cc+'40':'transparent'}`,background:active?`${cc}10`:'transparent',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2,marginBottom:2}}>
                  <span style={{fontSize:16}}>{CATEGORY_EMOJI[c]}</span>
                  <span style={{fontSize:7,color:active?cc:DIM,textAlign:'center',lineHeight:1.2,wordBreak:'break-word'}}>{c.split(' ')[0]}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Apps list */}
        <div style={{flex:1,overflowY:'auto',padding:'10px 10px 100px'}}>

          {/* Stats (All view) */}
          {cat==='All'&&!search&&(
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5,marginBottom:12}}>
              {[{v:MEGA_STATS.total,l:'Apps',c:ACCENT},{v:MEGA_STATS.noKey,l:'No Key',c:'#22c55e'},{v:MEGA_STATS.withApi,l:'API',c:'#a78bfa'},{v:MEGA_STATS.india,l:'India',c:'#fb923c'}].map(s=>(
                <div key={s.l} style={{padding:'8px 4px',borderRadius:9,background:CARD,border:`1px solid ${BORDER}`,textAlign:'center'}}>
                  <div style={{fontSize:15,fontWeight:800,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:8,color:DIM}}>{s.l}</div>
                </div>
              ))}
            </div>
          )}

          {/* Cat header */}
          {!search&&cat!=='All'&&cat!=='Pinned'&&cat!=='Recent'&&cat!=='India'&&(
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,padding:'8px 10px',borderRadius:10,background:`${CAT_COLORS[cat]||ACCENT}08`,border:`1px solid ${CAT_COLORS[cat]||ACCENT}25`}}>
              <span style={{fontSize:20}}>{CATEGORY_EMOJI[cat as MegaCategory]}</span>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:CAT_COLORS[cat]||ACCENT}}>{cat}</div>
                <div style={{fontSize:9,color:DIM}}>{apps.length} apps</div>
              </div>
            </div>
          )}

          {apps.length===0&&(
            <div style={{textAlign:'center',padding:'40px 20px',color:DIM,fontSize:12}}>
              {cat==='Pinned'?'⭐ Koi pinned app nahi\nApp card pe ☆ dabao':cat==='Recent'?'🕐 Abhi tak koi app use nahi kiya':'Kuch nahi mila'}
            </div>
          )}

          {/* Search results with category labels */}
          {search?apps.map(app=>(
            <div key={app.id} style={{marginBottom:4}}>
              <div style={{fontSize:8,color:DIM,marginBottom:3,paddingLeft:4}}>{CATEGORY_EMOJI[app.category as MegaCategory]} {app.category}</div>
              <AppCard app={app} pinned={pinned.includes(app.id)} onPin={togglePin} q={search}/>
            </div>
          )):apps.map(app=>(
            <AppCard key={app.id} app={app} pinned={pinned.includes(app.id)} onPin={togglePin}/>
          ))}

          {apps.length>0&&<div style={{textAlign:'center',padding:'12px 0',fontSize:9,color:DIM}}>{apps.length} apps · ☆ pin karo favorites</div>}
        </div>
      </div>

      <BottomNav/>
    </div>
  )
}
