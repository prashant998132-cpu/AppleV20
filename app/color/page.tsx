'use client'
// app/color/page.tsx — JARVIS Color Palette Tool
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initTheme } from '../../lib/theme'

function hexToRgb(h:string){const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return{r,g,b}}
function rgbToHex(r:number,g:number,b:number){return'#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('')}
function hexToHsl(h:string){const{r,g,b}=hexToRgb(h);const rn=r/255,gn=g/255,bn=b/255;const max=Math.max(rn,gn,bn),min=Math.min(rn,gn,bn);let hue=0,sat=0,lit=(max+min)/2;if(max!==min){const d=max-min;sat=lit>0.5?d/(2-max-min):d/(max+min);switch(max){case rn:hue=((gn-bn)/d+(gn<bn?6:0))/6;break;case gn:hue=((bn-rn)/d+2)/6;break;case bn:hue=((rn-gn)/d+4)/6;break;}};return{h:Math.round(hue*360),s:Math.round(sat*100),l:Math.round(lit*100)}}
function generatePalette(hex:string):{name:string;hex:string}[]{
  const{h,s,l}=hexToHsl(hex);
  const hslToHex=(h:number,s:number,l:number)=>{s/=100;l/=100;const a=s*Math.min(l,1-l);const f=(n:number)=>{const k=(n+h/30)%12;const c=l-a*Math.max(Math.min(k-3,9-k,1),-1);return Math.round(255*c).toString(16).padStart(2,'0')};return`#${f(0)}${f(8)}${f(4)}`}
  return[
    {name:'Lighter 2',hex:hslToHex(h,s,Math.min(l+30,95))},
    {name:'Lighter 1',hex:hslToHex(h,s,Math.min(l+15,95))},
    {name:'Base',hex},
    {name:'Darker 1',hex:hslToHex(h,s,Math.max(l-15,5))},
    {name:'Darker 2',hex:hslToHex(h,s,Math.max(l-30,5))},
    {name:'Complementary',hex:hslToHex((h+180)%360,s,l)},
    {name:'Triadic 1',hex:hslToHex((h+120)%360,s,l)},
    {name:'Triadic 2',hex:hslToHex((h+240)%360,s,l)},
  ]
}

const PRESETS=['#00e5ff','#f59e0b','#22c55e','#ef4444','#a78bfa','#f97316','#ec4899','#3b82f6','#14b8a6','#84cc16']

export default function ColorPage() {
  const router = useRouter()
  const [color, setColor] = useState('#00e5ff')
  const [palette, setPalette] = useState<{name:string;hex:string}[]>([])
  const [copied, setCopied] = useState('')
  const [saved, setSaved] = useState<string[]>([])

  useEffect(()=>{
    initTheme()
    setPalette(generatePalette('#00e5ff'))
    try{setSaved(JSON.parse(localStorage.getItem('jarvis_colors')||'[]'))}catch{}
  },[])

  const pick=(h:string)=>{setColor(h);setPalette(generatePalette(h))}
  const copy=(h:string)=>{navigator.clipboard.writeText(h);setCopied(h);setTimeout(()=>setCopied(''),1500)}
  const toggleSave=(h:string)=>{const n=saved.includes(h)?saved.filter(x=>x!==h):[h,...saved];setSaved(n);localStorage.setItem('jarvis_colors',JSON.stringify(n))}

  const rgb=hexToRgb(color);const hsl=hexToHsl(color)
  const isLight=hsl.l>60

  return (
    <div style={{minHeight:'100dvh',background:'var(--bg)',color:'var(--text)',fontFamily:"'Inter',sans-serif"}}>
      <div className="bg-grid"/>
      <div style={{position:'sticky',top:0,zIndex:50,background:'var(--header)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--border)',padding:'10px 16px',display:'flex',alignItems:'center',gap:8}}>
        <button onClick={()=>router.push('/')} style={{background:'var(--accent-bg)',border:'1px solid var(--border-a)',borderRadius:8,color:'var(--accent)',fontSize:14,fontWeight:800,width:28,height:28,fontFamily:'monospace'}}>J</button>
        <div style={{flex:1,fontSize:15,fontWeight:700}}>🎨 Color Tools</div>
      </div>

      <div style={{padding:'14px 14px 80px'}}>
        {/* Hero picker */}
        <div style={{background:color,borderRadius:16,padding:'20px',marginBottom:12,textAlign:'center'}}>
          <div style={{fontSize:28,fontWeight:900,color:isLight?'#000':'#fff',fontFamily:"'JetBrains Mono',monospace",marginBottom:4}}>{color.toUpperCase()}</div>
          <div style={{fontSize:12,color:isLight?'rgba(0,0,0,.6)':'rgba(255,255,255,.7)'}}>RGB({rgb.r},{rgb.g},{rgb.b}) · HSL({hsl.h},{hsl.s}%,{hsl.l}%)</div>
          <input type="color" value={color} onChange={e=>pick(e.target.value)} style={{marginTop:10,width:60,height:40,border:'none',borderRadius:8,cursor:'pointer',background:'transparent'}}/>
        </div>

        {/* Hex input */}
        <div style={{display:'flex',gap:8,marginBottom:12}}>
          <input value={color} onChange={e=>{const v=e.target.value;if(/^#[0-9a-fA-F]{0,6}$/.test(v)){setColor(v);if(v.length===7)pick(v)}}} style={{flex:1,background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 12px',color:'var(--text)',fontSize:16,fontFamily:"'JetBrains Mono',monospace"}}/>
          <button onClick={()=>copy(color)} style={{padding:'10px 16px',background:'var(--accent-bg)',border:'1px solid var(--border-a)',borderRadius:10,color:'var(--accent)',fontSize:12,cursor:'pointer',fontWeight:700}}>{copied===color?'✓':'⎘ Copy'}</button>
          <button onClick={()=>toggleSave(color)} style={{padding:'10px',background:'rgba(255,255,255,.06)',border:'1px solid var(--border)',borderRadius:10,fontSize:16,cursor:'pointer',color:saved.includes(color)?'#f59e0b':'var(--text-4)'}}>⭐</button>
        </div>

        {/* Presets */}
        <div style={{display:'flex',gap:6,overflowX:'auto',marginBottom:14}} className="no-scroll">
          {PRESETS.map(p=><div key={p} onClick={()=>pick(p)} style={{width:36,height:36,borderRadius:10,background:p,cursor:'pointer',flexShrink:0,border:`2px solid ${color===p?'#fff':'transparent'}`}}/>)}
        </div>

        {/* Palette */}
        <div style={{fontSize:11,color:'var(--text-3)',fontWeight:600,marginBottom:8}}>GENERATED PALETTE</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:14}}>
          {palette.map(p=>(
            <div key={p.name} onClick={()=>copy(p.hex)} style={{cursor:'pointer',borderRadius:10,overflow:'hidden'}}>
              <div style={{height:60,background:p.hex}}/>
              <div style={{padding:'4px 4px',background:'var(--bg-card)',border:'1px solid var(--border)',borderBottomLeftRadius:10,borderBottomRightRadius:10}}>
                <div style={{fontSize:9,color:'var(--text-3)',marginBottom:1}}>{p.name}</div>
                <div style={{fontSize:9,fontFamily:"'JetBrains Mono',monospace",color:'var(--text)',display:'flex',justifyContent:'space-between'}}>
                  {p.hex.slice(0,7).toUpperCase()}{copied===p.hex&&<span style={{color:'#22c55e'}}>✓</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Saved */}
        {saved.length>0&&(
          <>
            <div style={{fontSize:11,color:'var(--text-3)',fontWeight:600,marginBottom:8}}>⭐ SAVED COLORS</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {saved.map(s=>(
                <div key={s} onClick={()=>pick(s)} style={{width:44,height:44,borderRadius:10,background:s,cursor:'pointer',border:`2px solid ${color===s?'#fff':'transparent'}`,position:'relative'}}>
                  <button onClick={e=>{e.stopPropagation();toggleSave(s)}} style={{position:'absolute',top:-4,right:-4,width:14,height:14,background:'#ef4444',border:'none',borderRadius:'50%',color:'#fff',fontSize:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
