// lib/providers/firebase.ts — Firebase optional layer (realtime sync)
// Only activates if FIREBASE_API_KEY + FIREBASE_PROJECT_ID are in localStorage
// Mirrors Dexie stores to Firestore collections

const getFBKey     = () => typeof window !== 'undefined' ? localStorage.getItem('jarvis_key_FIREBASE_API_KEY')    || '' : ''
const getFBProject = () => typeof window !== 'undefined' ? localStorage.getItem('jarvis_key_FIREBASE_PROJECT_ID') || '' : ''

export function isFirebaseEnabled(): boolean {
  return !!(getFBKey() && getFBProject())
}

// REST-based Firestore (no SDK needed)
async function fbRequest(path: string, method = 'GET', body?: any): Promise<any> {
  const key = getFBKey(); const project = getFBProject()
  if (!key || !project) return null
  const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`
  try {
    const res = await fetch(`${base}/${path}?key=${key}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(8000),
    })
    return res.ok ? res.json() : null
  } catch { return null }
}

// Convert JS value to Firestore field value
function toFBValue(v: any): any {
  if (typeof v === 'string')  return { stringValue: v }
  if (typeof v === 'number')  return { integerValue: String(v) }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (v === null)             return { nullValue: null }
  return { stringValue: JSON.stringify(v) }
}

function toFBDoc(data: Record<string, any>): any {
  return { fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toFBValue(v)])) }
}

// Save memory to Firebase
export async function fbSaveMemory(mem: { type: string; data: string; importance: number; timestamp: number }): Promise<void> {
  if (!isFirebaseEnabled()) return
  const deviceId = localStorage.getItem('jarvis_device_id') || 'unknown'
  const id = `${deviceId}_${mem.timestamp}`
  await fbRequest(`jarvis_memories/${id}`, 'PATCH', toFBDoc({ ...mem, deviceId }))
}

// Save profile key
export async function fbSaveProfile(key: string, value: any): Promise<void> {
  if (!isFirebaseEnabled()) return
  const deviceId = localStorage.getItem('jarvis_device_id') || 'unknown'
  await fbRequest(`jarvis_profile/${deviceId}_${key}`, 'PATCH', toFBDoc({ key, value: JSON.stringify(value), deviceId, updatedAt: Date.now() }))
}

// Sync status
export function getFirebaseStatus(): { enabled: boolean; project: string } {
  return { enabled: isFirebaseEnabled(), project: getFBProject().slice(0, 20) }
}
