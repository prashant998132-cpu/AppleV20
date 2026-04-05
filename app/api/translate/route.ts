// app/api/translate/route.ts — Free translation via MyMemory API
import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const { text, from='auto', to='hi' } = await req.json()
  if (!text) return NextResponse.json({ error: 'No text' }, { status: 400 })
  
  try {
    const langpair = `${from==='auto'?'en':from}|${to}`
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0,500))}&langpair=${langpair}`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const data = await res.json()
    return NextResponse.json({ 
      translation: data.responseData?.translatedText || text,
      confidence: data.responseData?.match || 0
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
