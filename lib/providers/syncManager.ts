// lib/providers/syncManager.ts
// ══════════════════════════════════════════════════════════════
// JARVIS Smart Storage Cascade
// Layer 1 → Dexie (IndexedDB) — always, offline-first
// Layer 2 → Supabase (optional cloud) — si key hai tab
// Layer 3 → localStorage queue — offline changes buffer
// Silent degradation — koi error nahi dikhega user ko
// ══════════════════════════════════════════════════════════════

import { saveChat as dbSaveChat, addMemory, setProfile, getImportantMemories, getRecentChats, type Chat, type Memory } from '../db'

// ─── Supabase credentials (Settings mein user deta hai) ───
const getSBUrl = () => typeof window !== 'undefined' ? localStorage.getItem('jarvis_key_SUPABASE_URL')    || '' : ''
const getSBKey = () => typeof window !== 'undefined' ? localStorage.getItem('jarvis_key_SUPABASE_ANON_KEY') || '' : ''
const getDeviceId = () => {
  if (typeof window === 'undefined') return 'server'
  let id = localStorage.getItem('jarvis_device_id')
  if (!id) { id = `device_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; localStorage.setItem('jarvis_device_id', id) }
  return id
}

// ─── Sync queue (offline changes buffer) ──────────────────
interface SyncItem { table: string; action: 'upsert'|'delete'; data: any; ts: number }

const QUEUE_KEY = 'jarvis_sync_queue_v1'
function getQueue(): SyncItem[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') } catch { return [] }
}
function pushQueue(item: SyncItem) {
  const q = getQueue()
  q.push(item)
  if (q.length > 200) q.splice(0, q.length - 200) // max 200 queued
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)) } catch {}
}
function clearQueue() { try { localStorage.removeItem(QUEUE_KEY) } catch {} }

// ─── Supabase REST calls ───────────────────────────────────
async function sbRequest(path: string, method: string, body?: any): Promise<any> {
  const url = getSBUrl(); const key = getSBKey()
  if (!url || !key) return null
  try {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      method,
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const text = await res.text()
    return text ? JSON.parse(text) : true
  } catch { return null }
}

// ─── Schema initializer (run once) ────────────────────────
export async function initSupabaseSchema(): Promise<boolean> {
  const url = getSBUrl(); const key = getSBKey()
  if (!url || !key) return false

  // Test connection with a simple SELECT
  const test = await sbRequest('jarvis_chats?limit=1&select=id', 'GET')
  if (test !== null) return true // tables exist

  // Tables don't exist — user needs to run SQL in Supabase dashboard
  console.info('[JARVIS Sync] Supabase tables not found. Run setup SQL in dashboard.')
  return false
}

// SQL to paste in Supabase SQL editor (shown in Settings):
export const SUPABASE_SETUP_SQL = `
-- Run this in Supabase SQL Editor (one time)
create table if not exists jarvis_chats (
  id text primary key, device_id text, role text, content text,
  timestamp bigint, mood text, feedback text, tools_used text[],
  mode text, updated_at bigint default extract(epoch from now())*1000
);
create table if not exists jarvis_memories (
  id text primary key, device_id text, type text, data text,
  timestamp bigint, importance int, last_used bigint, use_count int,
  updated_at bigint default extract(epoch from now())*1000
);
create table if not exists jarvis_profile (
  key text primary key, device_id text, value text, updated_at bigint
);
-- Enable RLS (optional but recommended)
alter table jarvis_chats    enable row level security;
alter table jarvis_memories enable row level security;
alter table jarvis_profile  enable row level security;
`.trim()

// ─── Push single item to Supabase ─────────────────────────
async function pushToSupabase(table: string, data: any): Promise<boolean> {
  const result = await sbRequest(`${table}?on_conflict=id`, 'POST', data)
  return result !== null
}

async function deleteFromSupabase(table: string, id: string): Promise<boolean> {
  const result = await sbRequest(`${table}?id=eq.${id}`, 'DELETE')
  return result !== null
}

// ─── MAIN API ──────────────────────────────────────────────

// Save chat — Dexie always, Supabase if available
export async function saveChat(chat: Chat): Promise<void> {
  // Local save handled by caller (app/page.tsx already calls db saveChat)
  if (!getSBUrl()) return
  const sbData = {
    id: `${getDeviceId()}_${chat.timestamp}`,
    device_id: getDeviceId(),
    role: chat.role, content: chat.content,
    timestamp: chat.timestamp, mood: chat.mood || null,
    feedback: chat.feedback || null, tools_used: chat.toolsUsed || [],
    mode: chat.mode || null, updated_at: Date.now(),
  }
  const ok = await pushToSupabase('jarvis_chats', sbData)
  if (!ok) pushQueue({ table:'jarvis_chats', action:'upsert', data:sbData, ts:Date.now() })
}

// Save memory — Dexie always, Supabase if available
export async function saveMemory(mem: Memory): Promise<void> {
  // Local save handled by addMemory helper
  if (!getSBUrl()) return
  const sbData = {
    id: `${getDeviceId()}_${mem.timestamp}_${mem.timestamp}`,
    device_id: getDeviceId(),
    type: mem.type, data: mem.data,
    timestamp: mem.timestamp, importance: mem.importance,
    last_used: mem.lastUsed || null, use_count: mem.useCount || 0,
    updated_at: Date.now(),
  }
  const ok = await pushToSupabase('jarvis_memories', sbData)
  if (!ok) pushQueue({ table:'jarvis_memories', action:'upsert', data:sbData, ts:Date.now() })
}

// Save profile key — Dexie always, Supabase if available
export async function saveProfile(key: string, value: any): Promise<void> {
  // Local save via setProfile handled separately

  if (!getSBUrl()) return
  const sbData = { key: `${getDeviceId()}_${key}`, device_id: getDeviceId(), value: JSON.stringify(value), updated_at: Date.now() }
  const ok = await pushToSupabase('jarvis_profile', sbData)
  if (!ok) pushQueue({ table:'jarvis_profile', action:'upsert', data:sbData, ts:Date.now() })
}

// ─── Sync queue flush (call on reconnect / app start) ─────
export async function flushSyncQueue(): Promise<{ flushed: number; failed: number }> {
  const url = getSBUrl(); const key = getSBKey()
  if (!url || !key) return { flushed: 0, failed: 0 }

  const queue = getQueue()
  if (!queue.length) return { flushed: 0, failed: 0 }

  let flushed = 0; let failed = 0

  for (const item of queue) {
    let ok = false
    if (item.action === 'upsert') ok = await pushToSupabase(item.table, item.data)
    if (item.action === 'delete') ok = await deleteFromSupabase(item.table, item.data.id)
    if (ok) flushed++; else failed++
  }

  if (failed === 0) clearQueue()
  else {
    // Keep only failed items
    const newQueue = queue.filter((_, i) => i >= flushed)
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue)) } catch {}
  }

  return { flushed, failed }
}

// ─── Pull from Supabase → merge into Dexie (multi-device sync) ─
export async function pullFromCloud(): Promise<{ synced: number }> {
  const url = getSBUrl(); const key = getSBKey()
  if (!url || !key) return { synced: 0 }

  let synced = 0
  const deviceId = getDeviceId()

  try {
    const mems = await sbRequest(`jarvis_memories?device_id=neq.${deviceId}&order=timestamp.desc&limit=100`, 'GET')
    if (Array.isArray(mems)) {
      const existing = await getImportantMemories(0, 200).catch(() => [])
      const existingTs = new Set(existing.map((m: any) => m.timestamp))
      for (const m of mems) {
        if (!existingTs.has(m.timestamp)) {
          await addMemory(m.type || 'fact', m.data, m.importance || 5).catch(() => {})
          synced++
        }
      }
    }
  } catch {}

  return { synced }
}

// ─── Sync status ───────────────────────────────────────────
export function getSyncStatus(): { enabled: boolean; queueSize: number; deviceId: string } {
  return {
    enabled:  !!getSBUrl(),
    queueSize: getQueue().length,
    deviceId: getDeviceId(),
  }
}

// ─── Auto-sync on window focus / online ───────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { flushSyncQueue().catch(() => {}) })
  window.addEventListener('focus',  () => { flushSyncQueue().catch(() => {}) })
}

// ─── Pull chats from Supabase → merge into Dexie ──────────
export async function pullChats(limit = 100): Promise<{ synced: number }> {
  const url = getSBUrl(); const key = getSBKey()
  if (!url || !key) return { synced: 0 }
  let synced = 0
  try {
    const deviceId = getDeviceId()
    // Get chats from OTHER devices (not this one)
    const chats = await sbRequest(
      `jarvis_chats?device_id=neq.${deviceId}&order=timestamp.desc&limit=${limit}`,
      'GET'
    )
    if (Array.isArray(chats) && chats.length) {
      // Get existing timestamps to avoid duplicates
      const existing = await getRecentChats(500).catch(() => [])
      const existingTs = new Set(existing.map((c: any) => c.timestamp))
      for (const c of chats) {
        if (!existingTs.has(c.timestamp)) {
          await dbSaveChat({
            role: c.role, content: c.content,
            timestamp: c.timestamp, mood: c.mood || undefined,
            mode: c.mode || undefined,
          })
          synced++
        }
      }
    }
  } catch {}
  return { synced }
}

// ─── Full sync: flush queue + pull from cloud ─────────────
export async function syncAll(): Promise<{ pushed: number; pulled: number }> {
  const [pushResult, pullChatsResult, pullResult] = await Promise.all([
    flushSyncQueue(),
    pullChats(50),
    pullFromCloud(),
  ])
  return {
    pushed: pushResult.flushed,
    pulled: pullChatsResult.synced + pullResult.synced,
  }
}

// ─── Check if Supabase is configured ─────────────────────
export function isSupabaseConfigured(): boolean {
  return !!(getSBUrl() && getSBKey())
}

// ─── Get last sync timestamp ──────────────────────────────
export function getLastSyncTime(): number {
  try { return parseInt(localStorage.getItem('jarvis_last_sync') || '0') } catch { return 0 }
}
export function setLastSyncTime() {
  try { localStorage.setItem('jarvis_last_sync', String(Date.now())) } catch {}
}
