'use client'
// components/shared/ChatHistorySidebar.tsx — JARVIS v21
import React, { useState, useEffect, useCallback } from 'react'
import type { MouseEvent } from 'react'
import {
  getAllHistorySessions,
  deleteHistorySession,
  pinHistorySession,
  type HistorySession,
} from '../../lib/db'

interface Props {
  open: boolean
  onClose: () => void
  currentSessionId: string
  onNewChat: () => void
  onSelectSession: (session: HistorySession) => void
}

function timeLabel(ts: number): string {
  const now = Date.now()
  const diff = now - ts
  const day = 86400000
  if (diff < day) return new Date(ts).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })
  if (diff < 2 * day) return 'Kal'
  if (diff < 7 * day) return `${Math.floor(diff / day)} din pehle`
  return new Date(ts).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' })
}

function groupSessions(sessions: HistorySession[]): { label: string; items: HistorySession[] }[] {
  const now = Date.now()
  const day = 86400000
  const groups: { label: string; cutoff: number }[] = [
    { label: '📌 Pinned', cutoff: 0 },
    { label: 'Aaj', cutoff: now - day },
    { label: 'Kal', cutoff: now - 2 * day },
    { label: 'Pichle 7 Din', cutoff: now - 7 * day },
    { label: 'Pichle 30 Din', cutoff: now - 30 * day },
    { label: 'Purana', cutoff: 0 },
  ]

  const pinned = sessions.filter(s => s.pinned)
  const rest = sessions.filter(s => !s.pinned)

  const result: { label: string; items: HistorySession[] }[] = []

  if (pinned.length) result.push({ label: '📌 Pinned', items: pinned })

  const today    = rest.filter(s => s.updatedAt > now - day)
  const kal      = rest.filter(s => s.updatedAt <= now - day && s.updatedAt > now - 2 * day)
  const week     = rest.filter(s => s.updatedAt <= now - 2 * day && s.updatedAt > now - 7 * day)
  const month    = rest.filter(s => s.updatedAt <= now - 7 * day && s.updatedAt > now - 30 * day)
  const older    = rest.filter(s => s.updatedAt <= now - 30 * day)

  if (today.length)  result.push({ label: 'Aaj',            items: today })
  if (kal.length)    result.push({ label: 'Kal',            items: kal })
  if (week.length)   result.push({ label: 'Pichle 7 Din',   items: week })
  if (month.length)  result.push({ label: 'Pichle 30 Din',  items: month })
  if (older.length)  result.push({ label: 'Purana',         items: older })

  return result
}

export default function ChatHistorySidebar({ open, onClose, currentSessionId, onNewChat, onSelectSession }: Props) {
  const [sessions, setSessions] = useState<HistorySession[]>([])
  const [loading, setLoading] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const all = await getAllHistorySessions()
    setSessions(all)
    setLoading(false)
  }, [])

  useEffect(() => { if (open) load() }, [open, load])

  const handlePin = async (id: string, pinned: boolean, e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    await pinHistorySession(id, !pinned)
    setSessions((p: HistorySession[]) => p.map((s: HistorySession) => s.id === id ? { ...s, pinned: !s.pinned } : s))
    setActiveMenu(null)
  }

  const handleDelete = async (id: string, e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (!confirm('Yeh chat delete karo?')) return
    await deleteHistorySession(id)
    setSessions((p: HistorySession[]) => p.filter((s: HistorySession) => s.id !== id))
    setActiveMenu(null)
  }

  const filtered = search.trim()
    ? sessions.filter((s: HistorySession) => s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.summary?.toLowerCase().includes(search.toLowerCase()))
    : sessions

  const groups = groupSessions(filtered)

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(2px)' }}
        />
      )}

      {/* Sidebar panel */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
        width: 280, maxWidth: '82vw',
        background: 'rgba(6,10,20,.98)',
        borderRight: '1px solid rgba(0,229,255,.08)',
        display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform .25s cubic-bezier(.4,0,.2,1)',
        boxShadow: open ? '4px 0 32px rgba(0,0,0,.6)' : 'none',
      }}>

        {/* Header */}
        <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid rgba(255,255,255,.05)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg,rgba(0,229,255,.2),rgba(109,40,217,.2))', border: '1px solid rgba(0,229,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#00e5ff', fontFamily: "'Space Mono',monospace" }}>J</div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#e8f4ff', letterSpacing: 2, fontFamily: "'Space Mono',monospace" }}>CHATS</span>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#2a5070', fontSize: 18, cursor: 'pointer', padding: '2px 6px' }}>✕</button>
          </div>

          {/* New Chat button */}
          <button onClick={() => { onNewChat(); onClose() }}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 11, background: 'rgba(0,229,255,.07)', border: '1px solid rgba(0,229,255,.18)', color: '#00e5ff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 16 }}>✏️</span> Naya Chat
          </button>

          {/* Search */}
          <input
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Chats mein search karo..."
            style={{ width: '100%', padding: '8px 10px', borderRadius: 9, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', color: '#c8e8ff', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Session list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}
          onClick={() => setActiveMenu(null)}>

          {loading && (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#1e3858', fontSize: 12 }}>Loading...</div>
          )}

          {!loading && sessions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#1e3858' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
              <div style={{ fontSize: 12 }}>Abhi tak koi chat nahi</div>
              <div style={{ fontSize: 10, marginTop: 4 }}>Pehla message bhejo!</div>
            </div>
          )}

          {groups.map(group => (
            <div key={group.label}>
              <div style={{ padding: '6px 14px 3px', fontSize: 9, fontWeight: 700, color: '#1a3050', letterSpacing: 2, textTransform: 'uppercase' as const }}>
                {group.label}
              </div>
              {group.items.map(session => (
                <div key={session.id} style={{ position: 'relative' }}>
                  <div
                    onClick={() => { onSelectSession(session); onClose() }}
                    style={{
                      padding: '9px 12px', margin: '1px 6px', borderRadius: 9, cursor: 'pointer',
                      background: session.id === currentSessionId ? 'rgba(0,229,255,.08)' : 'transparent',
                      border: `1px solid ${session.id === currentSessionId ? 'rgba(0,229,255,.15)' : 'transparent'}`,
                      display: 'flex', alignItems: 'center', gap: 8,
                      transition: 'background .15s',
                    }}
                    onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => { if (session.id !== currentSessionId) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.03)' }}
                    onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => { if (session.id !== currentSessionId) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    {/* Icon */}
                    <span style={{ fontSize: 13, flexShrink: 0 }}>
                      {session.compressed ? '📦' : session.pinned ? '📌' : '💬'}
                    </span>

                    {/* Title + meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: session.id === currentSessionId ? '#00e5ff' : '#c8e8ff', fontWeight: session.id === currentSessionId ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                        {session.title}
                      </div>
                      <div style={{ fontSize: 9, color: '#1e3858', marginTop: 1, display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span>{timeLabel(session.updatedAt)}</span>
                        {session.compressed && <span style={{ color: '#4a3080' }}>· compressed</span>}
                        {session.messageCount > 0 && <span>{session.messageCount} msgs</span>}
                      </div>
                      {session.compressed && session.summary && (
                        <div style={{ fontSize: 10, color: '#2a4060', marginTop: 3, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
                          {session.summary}
                        </div>
                      )}
                    </div>

                    {/* Menu button */}
                    <button
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); setActiveMenu(activeMenu === session.id ? null : session.id) }}
                      style={{ background: 'none', border: 'none', color: '#1e3858', fontSize: 14, cursor: 'pointer', padding: '2px 4px', flexShrink: 0, opacity: activeMenu === session.id ? 1 : 0.4 }}
                    >⋯</button>
                  </div>

                  {/* Context menu */}
                  {activeMenu === session.id && (
                    <div style={{
                      position: 'absolute', right: 12, top: '100%', zIndex: 10,
                      background: 'rgba(8,14,26,.98)', border: '1px solid rgba(0,229,255,.12)',
                      borderRadius: 10, overflow: 'hidden', width: 150,
                      boxShadow: '0 4px 16px rgba(0,0,0,.6)',
                    }}>
                      <button onClick={e => handlePin(session.id, session.pinned, e)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#c8e8ff', textAlign: 'left' as const }}>
                        {session.pinned ? '📌 Unpin karo' : '📌 Pin karo'}
                      </button>
                      <div style={{ height: 1, background: 'rgba(255,255,255,.05)' }} />
                      <button onClick={e => handleDelete(session.id, e)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#ff6060', textAlign: 'left' as const }}>
                        🗑️ Delete karo
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,.04)', flexShrink: 0 }}>
          <div style={{ fontSize: 9, color: '#0e1e2e', textAlign: 'center' as const }}>
            15 din purani history auto-compress hoti hai · Pinned chats safe rehti hain
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </>
  )
}
