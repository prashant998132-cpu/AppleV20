'use client'
// NavDrawer v2 — All pages including new ones
import { useRouter, usePathname } from 'next/navigation'

interface Props { open: boolean; onClose: () => void }

const NAV_ITEMS = [
  { path:'/',          icon:'🤖', label:'JARVIS',      color:'#00e5ff', desc:'Main chat' },
  { path:'/dashboard', icon:'📊', label:'Dashboard',   color:'#60a5fa', desc:'Overview' },
  { path:'/study',     icon:'📚', label:'NEET Study',  color:'#f59e0b', desc:'Prepare' },
  { path:'/briefing',  icon:'🗞️', label:'Briefing',    color:'#a78bfa', desc:'Daily news' },
  { path:'/widgets',   icon:'🧩', label:'Widgets',     color:'#34d399', desc:'Live data', badge:'NEW' },
  { path:'/todo',      icon:'✅', label:'Todo',        color:'#22c55e', desc:'Tasks', badge:'NEW' },
  { path:'/notes',     icon:'📝', label:'Notes',       color:'#60a5fa', desc:'Quick notes', badge:'NEW' },
  { path:'/habits',    icon:'🔥', label:'Habits',      color:'#f97316', desc:'Streaks', badge:'NEW' },
  { path:'/timer',     icon:'⏱️', label:'Timer',       color:'#f43f5e', desc:'Pomodoro', badge:'NEW' },
  { path:'/india',     icon:'🇮🇳', label:'India Hub',  color:'#fb923c', desc:'Bharat' },
  { path:'/media',     icon:'🎵', label:'Media',       color:'#ec4899', desc:'Music & more' },
  { path:'/anime',     icon:'🌸', label:'Anime',       color:'#f472b6', desc:'Discover' },
  { path:'/studio',    icon:'🎨', label:'Studio',      color:'#818cf8', desc:'AI create' },
  { path:'/voice',     icon:'🎙️', label:'Voice',       color:'#34d399', desc:'Voice mode' },
  { path:'/learn',     icon:'🧠', label:'Learn',       color:'#60a5fa', desc:'Courses' },
  { path:'/tools',     icon:'🔧', label:'Tools',       color:'#94a3b8', desc:'Utilities' },
  { path:'/apps',      icon:'📱', label:'Apps',        color:'#60a5fa', desc:'App launcher' },
  { path:'/connected', icon:'🔌', label:'Connected',   color:'#34d399', desc:'Integrations' },
  { path:'/canva',     icon:'✏️', label:'Canva',       color:'#a78bfa', desc:'Design' },
  { path:'/system',    icon:'⚙️', label:'System',      color:'#94a3b8', desc:'Status' },
  { path:'/settings',  icon:'🔑', label:'Settings',    color:'#6b7280', desc:'Keys & profile' },
]

export default function NavDrawer({ open, onClose }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  const go = (path: string) => { onClose(); router.push(path) }

  return (
    <>
      {open && <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:98, background:'rgba(0,0,0,.6)', backdropFilter:'blur(4px)' }}/>}
      <div style={{
        position:'fixed', top:0, left:0, bottom:0, zIndex:99, width:260,
        background:'var(--bg-card)', borderRight:'1px solid var(--border)',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition:'transform .25s ease', display:'flex', flexDirection:'column',
        boxShadow: open ? '4px 0 32px rgba(0,0,0,.4)' : 'none'
      }}>
        {/* Header */}
        <div style={{ padding:'16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'var(--accent-bg)', border:'1px solid var(--border-a)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:800, color:'var(--accent)', fontFamily:'monospace' }}>J</div>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:'var(--text)' }}>JARVIS</div>
            <div style={{ fontSize:10, color:'var(--text-3)' }}>Your AI · v27</div>
          </div>
          <button onClick={onClose} style={{ marginLeft:'auto', background:'none', border:'none', color:'var(--text-3)', fontSize:18, cursor:'pointer' }}>✕</button>
        </div>

        {/* Nav items */}
        <div style={{ flex:1, overflowY:'auto', padding:'8px 0' }} className="no-scroll">
          {NAV_ITEMS.map(item => (
            <button key={item.path} onClick={() => go(item.path)} style={{
              width:'100%', display:'flex', alignItems:'center', gap:12, padding:'10px 16px',
              background: pathname===item.path ? 'var(--accent-bg)' : 'transparent',
              border: 'none', borderRight: pathname===item.path ? `2px solid var(--accent)` : '2px solid transparent',
              cursor:'pointer', textAlign:'left', transition:'background .15s'
            }}>
              <span style={{ fontSize:18, width:24, textAlign:'center' }}>{item.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:13, fontWeight:600, color: pathname===item.path ? 'var(--accent)' : 'var(--text)' }}>{item.label}</span>
                  {item.badge && <span style={{ fontSize:8, fontWeight:700, color:'#22c55e', background:'rgba(34,197,94,.12)', padding:'1px 5px', borderRadius:4, border:'1px solid rgba(34,197,94,.2)' }}>{item.badge}</span>}
                </div>
                <div style={{ fontSize:10, color:'var(--text-3)' }}>{item.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)' }}>
          <div style={{ fontSize:10, color:'var(--text-4)', textAlign:'center' }}>
            apple-v20.vercel.app · ₹0 cost
          </div>
        </div>
      </div>
    </>
  )
}
