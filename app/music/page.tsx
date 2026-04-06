'use client'
// app/music/page.tsx - JARVIS Music Player (Deezer)
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { initTheme } from '../../lib/theme'
interface Track{id:number;title:string;artist:string;preview:string;cover:string;duration:number}
const MOODS=[{label:'Bollywood 🇮🇳',q:'bollywood hits 2024'},{label:'Chill 😌',q:'chill lo-fi relax'},{label:'Party 🎉',q:'party dance hits'},{label:'Sad 💔',q:'sad emotional'},{label:'Hip Hop 🎤',q:'hip hop rap'},{label:'Classical 🎻',q:'indian classical music'}]

export default function MusicPage(){
  const router=useRouter()
  const[tracks,setTracks]=useState<Track[]>([])
  const[search,setSearch]=useState('')
  const[loading,setLoading]=useState(false)
  const[current,setCurrent]=useState<Track|null>(null)
  const[playing,setPlaying]=useState(false)
  const[prog,setProg]=useState(0)
  const[fav,setFav]=useState<Track[]>([])
  const[tab,setTab]=useState<'mood'|'search'|'fav'>('mood')
  const audioRef=useRef<HTMLAudioElement|null>(null)
  const intRef=useRef<any>(null)

  useEffect(()=>{initTheme();try{setFav(JSON.parse(localStorage.getItem('jarvis_music_fav')||'[]'))}catch{};load('bollywood hits 2024')},[])

  const load=async(q:string)=>{
    setLoading(true)
    try{
      const r=await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=20`)
      if(r.ok){const d=await r.json();setTracks((d.data||[]).filter((t:any)=>t.preview).map((t:any)=>({id:t.id,title:t.title,artist:t.artist.name,preview:t.preview,cover:t.album.cover_medium,duration:t.duration})))}
    }catch{}
    setLoading(false)
  }

  const playTrack=(t:Track)=>{
    audioRef.current?.pause();clearInterval(intRef.current)
    setCurrent(t);setProg(0);setPlaying(true)
    const a=new Audio(t.preview);audioRef.current=a;a.play()
    a.onended=()=>setPlaying(false)
    intRef.current=setInterval(()=>setProg(a.currentTime/30*100),200)
  }

  const toggle=()=>{
    if(!audioRef.current)return
    if(playing){audioRef.current.pause();setPlaying(false);clearInterval(intRef.current)}
    else{audioRef.current.play();setPlaying(true);intRef.current=setInterval(()=>setProg(audioRef.current!.currentTime/30*100),200)}
  }

  const toggleFav=(t:Track)=>{const n=fav.some(f=>f.id===t.id)?fav.filter(f=>f.id!==t.id):[t,...fav];setFav(n);localStorage.setItem('jarvis_music_fav',JSON.stringify(n))}
  const fmt=(s:number)=>`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`
  const display=tab==='fav'?fav:tracks

  return(
    <div style={{minHeight:'100dvh',background:'var(--bg)',color:'var(--text)',fontFamily:"'Inter',sans-serif"}}>
      <div className="bg-grid"/>
      <div style={{position:'sticky',top:0,zIndex:50,background:'var(--header)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--border)',padding:'10px 16px',display:'flex',alignItems:'center',gap:8}}>
        <button onClick={()=>router.push('/')} style={{background:'var(--accent-bg)',border:'1px solid var(--border-a)',borderRadius:8,color:'var(--accent)',fontSize:14,fontWeight:800,width:28,height:28,fontFamily:'monospace'}}>J</button>
        <div style={{flex:1}}><div style={{fontSize:15,fontWeight:700}}>🎵 Music Player</div><div style={{fontSize:10,color:'var(--text-3)'}}>Deezer · 30s previews</div></div>
      </div>

      {current&&<div style={{background:'rgba(236,72,153,.08)',borderBottom:'1px solid rgba(236,72,153,.2)',padding:'10px 14px',display:'flex',alignItems:'center',gap:10}}>
        <img src={current.cover} alt="" width={44} height={44} style={{borderRadius:8}} onError={e=>(e.currentTarget.style.display='none')}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{current.title}</div>
          <div style={{fontSize:10,color:'var(--text-3)',marginBottom:4}}>{current.artist}</div>
          <div style={{height:4,background:'var(--border)',borderRadius:2}}><div style={{height:'100%',background:'#ec4899',width:`${prog}%`,borderRadius:2,transition:'width .2s'}}/></div>
        </div>
        <button onClick={toggle} style={{width:38,height:38,borderRadius:'50%',background:'#ec4899',border:'none',color:'#fff',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{playing?'⏸':'▶'}</button>
      </div>}

      <div style={{padding:'8px 14px',display:'flex',gap:8}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){load(search);setTab('search')}}} placeholder="Artist, song search..." style={{flex:1,background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:10,padding:'8px 12px',color:'var(--text)',fontSize:13}}/>
        <button onClick={()=>{load(search);setTab('search')}} style={{padding:'8px 12px',background:'#ec4899',color:'#fff',border:'none',borderRadius:10,fontSize:12,fontWeight:700,cursor:'pointer'}}>Go</button>
      </div>

      <div style={{display:'flex',borderBottom:'1px solid var(--border)'}}>
        {(['mood','search','fav'] as const).map(t=><button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'8px',background:tab===t?'rgba(236,72,153,.1)':'transparent',border:'none',borderBottom:`2px solid ${tab===t?'#ec4899':'transparent'}`,color:tab===t?'#ec4899':'var(--text-3)',fontSize:11,fontWeight:600,cursor:'pointer',textTransform:'capitalize'}}>{t==='fav'?`❤️(${fav.length})`:t==='mood'?'🎭 Mood':'📋 Results'}</button>)}
      </div>

      {tab==='mood'&&<div style={{display:'flex',gap:6,padding:'8px 14px',overflowX:'auto',borderBottom:'1px solid var(--border)'}} className="no-scroll">
        {MOODS.map(m=><button key={m.q} onClick={()=>load(m.q)} style={{flexShrink:0,padding:'5px 10px',borderRadius:20,fontSize:11,background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',color:'var(--text-3)',cursor:'pointer'}}>{m.label}</button>)}
      </div>}

      <div style={{padding:'4px 14px 80px'}}>
        {loading&&<div style={{textAlign:'center',padding:24,color:'var(--text-3)'}}>🎵 Loading...</div>}
        {!loading&&display.length===0&&<div style={{textAlign:'center',padding:'40px 0',color:'var(--text-3)'}}>{tab==='fav'?'Koi favorite nahi.':'Search karo ya mood select karo.'}</div>}
        {display.map(t=>(
          <div key={t.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
            <div onClick={()=>playTrack(t)} style={{width:44,height:44,borderRadius:8,overflow:'hidden',cursor:'pointer',position:'relative',flexShrink:0}}>
              <img src={t.cover} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              {current?.id===t.id&&<div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>{playing?'⏸':'▶'}</div>}
            </div>
            <div style={{flex:1,minWidth:0,cursor:'pointer'}} onClick={()=>playTrack(t)}>
              <div style={{fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:current?.id===t.id?'#ec4899':'var(--text)'}}>{t.title}</div>
              <div style={{fontSize:10,color:'var(--text-3)'}}>{t.artist} · {fmt(t.duration)}</div>
            </div>
            <button onClick={()=>toggleFav(t)} style={{background:'none',border:'none',fontSize:16,cursor:'pointer',color:fav.some(f=>f.id===t.id)?'#ef4444':'var(--text-4)'}}>❤️</button>
          </div>
        ))}
      </div>
    </div>
  )
}
