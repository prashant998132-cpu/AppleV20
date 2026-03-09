// app/api/fetch-url/route.ts — URL fetcher + summarizer
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  if (!url?.trim()) return NextResponse.json({ error: 'No URL' }, { status: 400 })

  const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY

  try {
    // Fetch the URL
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JARVIS/1.0)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return NextResponse.json({ error: `Fetch failed: ${res.status}` })

    const html = await res.text()

    // Basic HTML → text extraction (no cheerio needed)
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4000) // First 4000 chars

    if (!geminiKey || text.length < 100) {
      return NextResponse.json({ summary: text.slice(0, 500) + '...', raw: true })
    }

    // Summarize with Gemini
    const sumRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `Yeh article/page ka concise summary do — Hindi/Hinglish mein, bullet points mein, 5-7 lines mein:\n\n${text}` }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 512 }
        }),
        signal: AbortSignal.timeout(10000),
      }
    )
    const sumData = await sumRes.json()
    const summary = sumData.candidates?.[0]?.content?.parts?.[0]?.text || text.slice(0, 500)

    return NextResponse.json({ summary, url, title: html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || url })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Fetch failed' }, { status: 500 })
  }
}
