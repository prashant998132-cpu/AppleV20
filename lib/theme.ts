// lib/theme.ts — Dark/Light mode theme system
export type Theme = 'dark' | 'light'
const THEME_KEY = 'jarvis_theme'

export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  return (localStorage.getItem(THEME_KEY) as Theme) || 'dark'
}

export function setTheme(t: Theme): void {
  localStorage.setItem(THEME_KEY, t)
  document.documentElement.setAttribute('data-theme', t)
  applyTheme(t)
}

export function applyTheme(t: Theme): void {
  const root = document.documentElement
  if (t === 'dark') {
    root.style.setProperty('--bg-primary', '#090d18')
    root.style.setProperty('--bg-card', '#0c1422')
    root.style.setProperty('--bg-surface', 'rgba(255,255,255,.03)')
    root.style.setProperty('--border', 'rgba(255,255,255,.06)')
    root.style.setProperty('--text-primary', '#e8f4ff')
    root.style.setProperty('--text-secondary', '#2a5070')
    root.style.setProperty('--text-muted', '#1e3858')
    root.style.setProperty('--accent', '#00e5ff')
    root.style.setProperty('--accent-dim', 'rgba(0,229,255,.1)')
  } else {
    root.style.setProperty('--bg-primary', '#f0f4f8')
    root.style.setProperty('--bg-card', '#ffffff')
    root.style.setProperty('--bg-surface', 'rgba(0,0,0,.03)')
    root.style.setProperty('--border', 'rgba(0,0,0,.1)')
    root.style.setProperty('--text-primary', '#0d1a2e')
    root.style.setProperty('--text-secondary', '#3a6080')
    root.style.setProperty('--text-muted', '#6a8090')
    root.style.setProperty('--accent', '#0070c0')
    root.style.setProperty('--accent-dim', 'rgba(0,112,192,.1)')
  }
}

export function toggleTheme(): Theme {
  const cur = getTheme()
  const next: Theme = cur === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}

export function initTheme(): void {
  if (typeof window === 'undefined') return
  applyTheme(getTheme())
}
