// app/api/scheduler/route.ts — JARVIS Background Scheduler v25
// Vercel Cron triggers this automatically — zero user action needed
// Also callable from SW background sync

import { NextRequest, NextResponse } from 'next/server'

const SECRET = 'jarvis-cron-2025'

type TaskResult = { task: string; status: 'ok' | 'skip' | 'error'; detail?: string; ms?: number }

async function runTask(task: string): Promise<TaskResult> {
  const t = Date.now()
  try {
    switch (task) {

      case 'health_check': {
        const checks = await Promise.allSettled([
          fetch('https://api.open-meteo.com/v1/forecast?latitude=24.5&longitude=81.3&current=temperature_2m', { signal: AbortSignal.timeout(5000) }),
          fetch('https://api.coingecko.com/api/v3/ping', { signal: AbortSignal.timeout(5000) }),
          fetch('https://hacker-news.firebaseio.com/v0/topstories.json', { signal: AbortSignal.timeout(5000) }),
          fetch('https://api.jikan.moe/v4/top/anime?limit=1', { signal: AbortSignal.timeout(5000) }),
        ])
        const names = ['weather', 'crypto', 'hackernews', 'jikan']
        const up = checks.map((r, i) => ({ [names[i]]: r.status === 'fulfilled' && (r.value as Response).ok }))
        return { task, status: 'ok', detail: JSON.stringify(Object.assign({}, ...up)), ms: Date.now() - t }
      }

      case 'cache_warmup': {
        const [w, c] = await Promise.allSettled([
          fetch('https://api.open-meteo.com/v1/forecast?latitude=24.5337&longitude=81.2965&current=temperature_2m,weather_code,wind_speed_10m&timezone=Asia/Kolkata'),
          fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=inr,usd'),
        ])
        return { task, status: 'ok', detail: `weather:${w.status} crypto:${c.status}`, ms: Date.now() - t }
      }

      case 'ping': return { task, status: 'ok', detail: 'pong', ms: Date.now() - t }
      case 'daily_summary': return { task, status: 'ok', detail: 'client_generates', ms: Date.now() - t }

      default: return { task, status: 'skip', detail: `unknown: ${task}` }
    }
  } catch (e) {
    return { task, status: 'error', detail: String(e), ms: Date.now() - t }
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const task   = searchParams.get('task') || 'ping'
  const secret = searchParams.get('secret') || ''
  const multi  = searchParams.get('multi') === '1'

  if (task !== 'ping' && secret !== SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (multi) {
    const results = await Promise.all(['health_check', 'cache_warmup', 'daily_summary'].map(runTask))
    return NextResponse.json({ ts: new Date().toISOString(), results }, { headers: { 'Cache-Control': 'no-store' } })
  }

  return NextResponse.json(await runTask(task), { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest) {
  const { task = 'ping' } = await req.json().catch(() => ({}))
  return NextResponse.json(await runTask(task), { headers: { 'Cache-Control': 'no-store' } })
}
