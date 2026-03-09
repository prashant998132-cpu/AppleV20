'use client'
import { useRouter, usePathname } from 'next/navigation'

const TABS = [
  { path: '/',        icon: '💬', label: 'Chat'    },
  { path: '/study',   icon: '📚', label: 'Study'   },
  { path: '/studio',  icon: '🎨', label: 'Studio'  },
  { path: '/apps',    icon: '🔗', label: 'Apps'    },
  { path: '/settings',icon: '⚙️', label: 'Settings'},
]

export default function BottomNav({ active }: { active?: string }) {
  const router   = useRouter()
  const pathname = usePathname()

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      display: 'flex', background: 'rgba(9,13,24,.97)',
      borderTop: '1px solid rgba(0,229,255,.08)',
      backdropFilter: 'blur(16px)', zIndex: 50,
      paddingBottom: 'env(safe-area-inset-bottom, 4px)',
    }}>
      {TABS.map(t => {
        const isActive = active
          ? (t.path === '/' ? active === 'chat' : t.path === `/${active}`)
          : pathname === t.path
        return (
          <button key={t.path} onClick={() => router.push(t.path)}
            style={{
              flex: 1, padding: '10px 0 8px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              background: 'transparent', border: 'none', cursor: 'pointer',
              borderTop: `2px solid ${isActive ? '#00e5ff' : 'transparent'}`,
              transition: 'all 0.15s',
            }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <span style={{ fontSize: 10, color: isActive ? '#00e5ff' : '#1e3858', letterSpacing: 0.5 }}>
              {t.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
