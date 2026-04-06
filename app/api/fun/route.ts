// app/api/fun/route.ts — Jokes, quotes, facts (free APIs)
import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const type = new URL(req.url).searchParams.get('type') || 'joke'
  
  if (type === 'joke') {
    try {
      const r = await fetch('https://official-joke-api.appspot.com/random_joke', { signal: AbortSignal.timeout(5000) })
      if (r.ok) { const d = await r.json(); return NextResponse.json({ text: `${d.setup}\n\n${d.punchline}`, type:'joke' }) }
    } catch {}
    try {
      const r = await fetch('https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,racist&type=twopart', { signal: AbortSignal.timeout(5000) })
      if (r.ok) { const d = await r.json(); return NextResponse.json({ text: `${d.setup}\n\n${d.delivery}`, type:'joke' }) }
    } catch {}
  }
  
  if (type === 'quote') {
    try {
      const r = await fetch('https://api.quotable.io/random?tags=wisdom,life,success', { signal: AbortSignal.timeout(5000) })
      if (r.ok) { const d = await r.json(); return NextResponse.json({ text: `"${d.content}" — ${d.author}`, type:'quote' }) }
    } catch {}
    try {
      const r = await fetch('https://zenquotes.io/api/random', { signal: AbortSignal.timeout(5000) })
      if (r.ok) { const d = await r.json(); return NextResponse.json({ text: `"${d[0].q}" — ${d[0].a}`, type:'quote' }) }
    } catch {}
  }
  
  if (type === 'fact') {
    try {
      const r = await fetch('https://uselessfacts.jsph.pl/random.json?language=en', { signal: AbortSignal.timeout(5000) })
      if (r.ok) { const d = await r.json(); return NextResponse.json({ text: d.text, type:'fact' }) }
    } catch {}
  }

  return NextResponse.json({ text: 'API unavailable', type })
}
