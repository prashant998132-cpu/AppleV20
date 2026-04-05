'use client'
import { useRouter, usePathname } from 'next/navigation'
interface Props { open: boolean; onClose: () => void }

const NAV = [
  // Core
  { path:'/',           icon:'🤖', label:'JARVIS',      color:'#00e5ff', desc:'Main AI chat',     group:'core' },
  { path:'/dashboard',  icon:'📊', label:'Dashboard',   color:'#60a5fa', desc:'Overview',          group:'core' },
  { path:'/briefing',   icon:'🗞️', label:'Briefing',    color:'#a78bfa', desc:'Daily digest',      group:'core' },
  // Live Data
  { path:'/widgets',    icon:'🧩', label:'Widgets',     color:'#34d399', desc:'Gold, crypto, news',group:'live', badge:'NEW' },
  { path:'/weather',    icon:'🌤️', label:'Weather',     color:'#60a5fa', desc:'7-day forecast',    group:'live', badge:'NEW' },
  { path:'/crypto',     icon:'₿',  label:'Crypto',      color:'#f97316', desc:'Market + portfolio', group:'live', badge:'NEW' },
  { path:'/news',       icon:'📰', label:'News',        color:'#f43f5e', desc:'India news live',   group:'live', badge:'NEW' },
  { path:'/india',      icon:'🇮🇳', label:'India Hub',  color:'#fb923c', desc:'PNR, gold, cricket', group:'live' },
  // Productivity
  { path:'/todo',       icon:'✅', label:'Todo',        color:'#22c55e', desc:'Tasks & goals',     group:'prod' },
  { path:'/notes',      icon:'📝', label:'Notes',       color:'#60a5fa', desc:'Quick notes',       group:'prod' },
  { path:'/habits',     icon:'🔥', label:'Habits',      color:'#f97316', desc:'Streak tracker',    group:'prod' },
  { path:'/timer',      icon:'⏱️', label:'Timer',       color:'#f43f5e', desc:'Pomodoro focus',    group:'prod' },
  // Tools
  { path:'/calculator', icon:'🧮', label:'Calculator',  color:'#a78bfa', desc:'Sci + converter',   group:'tools', badge:'NEW' },
  { path:'/qr',         icon:'📱', label:'QR Code',     color:'#34d399', desc:'Generate & scan',   group:'tools', badge:'NEW' },
  { path:'/tools',      icon:'🔧', label:'Tools',       color:'#94a3b8', desc:'All utilities',     group:'tools' },
  // Media
  { path:'/media',      icon:'🎵', label:'Media',       color:'#ec4899', desc:'Music & more',      group:'media' },
  { path:'/anime',      icon:'🌸', label:'Anime',       color:'#f472b6', desc:'Discover shows',    group:'media' },
  { path:'/studio',     icon:'🎨', label:'Studio',      color:'#818cf8', desc:'AI create',         group:'media' },
  { path:'/voice',      icon:'🎙️', label:'Voice',       color:'#34d399', desc:'Voice mode',        group:'media' },
  // Other
  { path:'/apps',       icon:'📱', label:'Apps',        color:'#60a5fa', desc:'App launcher',      group:'other' },
  { path:'/connected',  icon:'🔌', label:'Connected',   color:'#34d399', desc:'Integrations',      group:'other' },
  { path:'/canva',      icon:'✏️', label:'Canva',       color:'#a78bfa', desc:'Design',            group:'other' },
  { path:'/system',     icon:'⚙️', label:'System',      color:'#94a3b8', desc:'Status',            group:'other' },
  { path:'/settings',   icon:'🔑', label:'Settings',    color:'#6b7280', desc:'Keys & profile',    group:'other' },
]

const GROUP_LABELS: Record<string,string> = { core:'⚡ Core', live:'📡 Live Data', prod:'✅ Productivity', tools:'🔧 Tools', media:'🎬 Media', other:'⚙️ Other' }

export default function NavDrawer({ open, onClose }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const go = (path:string) => { onClose(); router.push(path) }
  const groups = [...new Set(NAV.map(n=>n.group))]

  return (
    <>
      {open&&<div onClick={onClose} style={{position:'fixed',inset:0,zIndex:98,background:'rgba(0,0,0,.6)',backdropFilter:'blur(4px)'}}/>}
      <div style={{position:'fixed',top:0,left:0,bottom:0,zIndex:99,width:270,background:'var(--bg-card)',borderRight:'1px solid var(--border)',transform:open?'translateX(0)':'translateX(-100%)',transition:'transform .25s ease',display:'flex',flexDirection:'column',boxShadow:open?'4px 0 32px rgba(0,0,0,.4)':'none'}}>
        <div style={{padding:'14px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:36,height:36,borderRadius:10,background:'var(--accent-bg)',border:'1px solid var(--border-a)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:'var(--accent)',fontFamily:'monospace'}}>J</div>
          <div><div style={{fontSize:15,fontWeight:800}}>JARVIS</div><div style={{fontSize:10,color:'var(--text-3)'}}>v27 · ₹0 cost</div></div>
          <button onClick={onClose} style={{marginLeft:'auto',background:'none',border:'none',color:'var(--text-3)',fontSize:18,cursor:'pointer'}}>✕</button>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'6px 0 16px'}} className="no-scroll">
          {groups.map(grp=>(
            <div key={grp}>
              <div style={{padding:'10px 16px 4px',fontSize:9,fontWeight:700,color:'var(--text-4)',letterSpacing:1.5,textTransform:'uppercase'}}>{GROUP_LABELS[grp]}</div>
              {NAV.filter(n=>n.group===grp).map(item=>(
                <button key={item.path} onClick={()=>go(item.path)} style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'9px 16px',background:pathname===item.path?'var(--accent-bg)':'transparent',border:'none',borderRight:pathname===item.path?'2px solid var(--accent)':'2px solid transparent',cursor:'pointer',textAlign:'left',transition:'background .15s'}}>
                  <span style={{fontSize:17,width:22,textAlign:'center',flexShrink:0}}>{item.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:5}}>
                      <span style={{fontSize:13,fontWeight:600,color:pathname===item.path?'var(--accent)':'var(--text)'}}>{item.label}</span>
                      {(item as any).badge&&<span style={{fontSize:8,fontWeight:700,color:'#22c55e',background:'rgba(34,197,94,.12)',padding:'1px 5px',borderRadius:4,border:'1px solid rgba(34,197,94,.2)'}}>{(item as any).badge}</span>}
                    </div>
                    <div style={{fontSize:10,color:'var(--text-3)'}}>{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
