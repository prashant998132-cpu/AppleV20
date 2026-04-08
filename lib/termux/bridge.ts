// lib/termux/bridge.ts — Termux bridge via localhost:1234
// MacroDroid ya Termux:API server se connect karta hai

const TERMUX_URL = 'http://localhost:1234'
const TIMEOUT = 3000

export const TERMUX_SERVER_SCRIPT = `# Termux HTTP server setup
pkg install python
python -m http.server 1234 &`

export async function isTermuxAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${TERMUX_URL}/ping`, {
      signal: AbortSignal.timeout(TIMEOUT)
    })
    return res.ok
  } catch {
    return false
  }
}

export async function termuxRun(cmd: string): Promise<string> {
  try {
    const res = await fetch(`${TERMUX_URL}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cmd }),
      signal: AbortSignal.timeout(10000)
    })
    if (!res.ok) throw new Error('Termux server error')
    const d = await res.json()
    return d.output || d.result || 'Done'
  } catch (e: any) {
    throw new Error(`Termux unavailable: ${e.message}`)
  }
}

export async function termuxToast(msg: string): Promise<void> {
  try {
    await fetch(`${TERMUX_URL}/toast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msg }),
      signal: AbortSignal.timeout(TIMEOUT)
    })
  } catch {}
}

export async function termuxVibrate(ms = 200): Promise<void> {
  try {
    await fetch(`${TERMUX_URL}/vibrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ms }),
      signal: AbortSignal.timeout(TIMEOUT)
    })
  } catch {}
}
