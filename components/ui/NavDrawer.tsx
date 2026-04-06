'use client'
import { useRouter, usePathname } from 'next/navigation'
interface Props { open: boolean; onClose: () => void }

const NAV = [
  // Core
  { path:'/',            icon:'🤖', label:'JARVIS Chat',    desc:'Main AI',         g:'core' },
  { path:'/dashboard',   icon:'📊', label:'Dashboard',      desc:'Overview',        g:'core' },
  { path:'/briefing',    icon:'🗞️', label:'Daily Briefing', desc:'Morning digest',  g:'core' },
  // Live
  { path:'/widgets',     icon:'🧩', label:'Widgets',        desc:'Live data',       g:'live' },
  { path:'/weather',     icon:'🌤️', label:'Weather',        desc:'7-day forecast',  g:'live' },
  { path:'/crypto',      icon:'₿',  label:'Crypto',         desc:'Market + portfolio',g:'live' },
  { path:'/news',        icon:'📰', label:'India News',     desc:'Live news',       g:'live' },
  { path:'/india',       icon:'🇮🇳', label:'India Hub',     desc:'PNR, gold, fuel', g:'live' },
  // Create
  { path:'/imagegen',    icon:'🎨', label:'Image Studio',   desc:'AI image gen',    g:'create', badge:'HOT' },
  { path:'/write',       icon:'✍️', label:'AI Writer',      desc:'Grammar + rephrase',g:'create', badge:'NEW' },
  { path:'/studio',      icon:'🌟', label:'Studio',         desc:'AI create',       g:'create' },
  { path:'/canva',       icon:'✏️', label:'Canva',          desc:'Design',          g:'create' },
  // Tools
  { path:'/calculator',  icon:'🧮', label:'Calculator',     desc:'Sci + converter', g:'tools' },
  { path:'/qr',          icon:'📱', label:'QR Generator',   desc:'Create QR codes', g:'tools' },
  { path:'/translate',   icon:'🌐', label:'Translator',     desc:'16 languages',    g:'tools', badge:'NEW' },
  { path:'/color',       icon:'🎨', label:'Color Tools',    desc:'Palette generator',g:'tools', badge:'NEW' },
  { path:'/tools',       icon:'🔧', label:'All Tools',      desc:'Utilities',       g:'tools' },
  // Life
  { path:'/todo',        icon:'✅', label:'Todo',           desc:'Task manager',    g:'life' },
  { path:'/notes',       icon:'📝', label:'Notes',          desc:'Quick notes',     g:'life' },
  { path:'/habits',      icon:'🔥', label:'Habits',         desc:'Streak tracker',  g:'life' },
  { path:'/timer',       icon:'⏱️', label:'Timer',          desc:'Pomodoro focus',  g:'life' },
  { path:'/journal',     icon:'📓', label:'Journal',        desc:'Daily diary',     g:'life', badge:'NEW' },
  { path:'/budget',      icon:'💰', label:'Budget',         desc:'Expense tracker', g:'life', badge:'NEW' },
  { path:'/fitness',     icon:'💪', label:'Fitness',        desc:'Workout tracker', g:'life', badge:'NEW' },
  // Fun
  { path:'/music',       icon:'🎵', label:'Music',          desc:'Deezer player',   g:'fun', badge:'NEW' },
  { path:'/games',       icon:'🎮', label:'Games',          desc:'Snake, Memory, Word',g:'fun', badge:'NEW' },
  { path:'/anime',       icon:'🌸', label:'Anime',          desc:'Discover shows',  g:'fun' },
  { path:'/media',       icon:'🎬', label:'Media',          desc:'Movies + music',  g:'fun' },
  // System
  { path:'/apps',        icon:'📱', label:'Apps',           desc:'Launcher',        g:'sys' },
  { path:'/connected',   icon:'🔌', label:'Connected',      desc:'Integrations',    g:'sys' },
  { path:'/voice',       icon:'🎙️', label:'Voice',          desc:'Voice mode',      g:'sys' },
  { path:'/system',      icon:'⚙️', label:'System',         desc:'Status',          g:'sys' },
  { path:'/settings',    icon:'🔑', label:'Settings',       desc:'Keys & profile',  g:'sys' },
]

const GROUPS: Record<string,string> = { core:'⚡ Core', live:'📡 Live Data', create:'✨ Create', tools:'🔧 Tools', life:'🧘 Life', fun:'🎮 Fun', sys:'⚙️ System' }

export default function NavDrawer({ open, onClose }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const go = (path:string) => { onClose(); router.push(path) }
  const groups = [...new Set(NAV.map(n=>n.g))]

  return (
    <>
      {open&&<div onClick={onClose} style={{position:'fixed',inset:0,zIndex:98,background:'rgba(0,0,0,.6)',backdropFilter:'blur(4px)'}}/>}
      <div style={{position:'fixed',top:0,left:0,bottom:0,zIndex:99,width:270,background:'var(--bg-card)',borderRight:'1px solid var(--border)',transform:open?'translateX(0)':'translateX(-100%)',transition:'transform .25s ease',display:'flex',flexDirection:'column',boxShadow:open?'4px 0 32px rgba(0,0,0,.4)':'none'}}>
        <div style={{padding:'14px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:36,height:36,borderRadius:10,background:'var(--accent-bg)',border:'1px solid var(--border-a)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:'var(--accent)',fontFamily:'monospace'}}>J</div>
          <div><div style={{fontSize:15,fontWeight:800}}>JARVIS</div><div style={{fontSize:10,color:'var(--text-3)'}}>v27 · {NAV.length} features</div></div>
          <button onClick={onClose} style={{marginLeft:'auto',background:'none',border:'none',color:'var(--text-3)',fontSize:18,cursor:'pointer'}}>✕</button>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'4px 0 16px'}} className="no-scroll">
          {groups.map(grp=>(
            <div key={grp}>
              <div style={{padding:'8px 16px 3px',fontSize:9,fontWeight:700,color:'var(--text-4)',letterSpacing:1.5,textTransform:'uppercase'}}>{GROUPS[grp]}</div>
              {NAV.filter(n=>n.g===grp).map(item=>(
                <button key={item.path} onClick={()=>go(item.path)} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'8px 16px',background:pathname===item.path?'var(--accent-bg)':'transparent',border:'none',borderRight:pathname===item.path?'2px solid var(--accent)':'2px solid transparent',cursor:'pointer',textAlign:'left',transition:'background .15s'}}>
                  <span style={{fontSize:16,width:20,textAlign:'center',flexShrink:0}}>{item.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:5}}>
                      <span style={{fontSize:12,fontWeight:600,color:pathname===item.path?'var(--accent)':'var(--text)'}}>{item.label}</span>
                      {(item as any).badge&&<span style={{fontSize:7,fontWeight:700,color:'#22c55e',background:'rgba(34,197,94,.12)',padding:'1px 4px',borderRadius:3,border:'1px solid rgba(34,197,94,.2)'}}>{(item as any).badge}</span>}
                    </div>
                    <div style={{fontSize:9,color:'var(--text-4)'}}>{item.desc}</div>
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
