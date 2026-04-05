// app/api/summarize/route.ts — Summarize any URL
import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'No URL' }, { status: 400 })
  
  try {
    // Fetch URL content
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JARVISBot/1.0)' },
      signal: AbortSignal.timeout(10000)
    })
    if (!res.ok) return NextResponse.json({ error: `HTTP ${res.status}` }, { status: 400 })
    
    let text = await res.text()
    // Strip HTML tags
    text = text.replace(/<script[\s\S]*?<\/script>/gi, '')
    text = text.replace(/<style[\s\S]*?<\/style>/gi, '')
    text = text.replace(/<[^>]+>/g, ' ')
    text = text.replace(/\s+/g, ' ').trim().slice(0, 3000)
    
    return NextResponse.json({ content: text, url })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
