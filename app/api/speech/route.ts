import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'edge'
export async function POST(req: NextRequest) {
  const { text, voice='alloy' } = await req.json()
  if (!text) return NextResponse.json({ error:'No text' },{status:400})
  const k = process.env.OPENAI_API_KEY
  if (k) {
    try {
      const r = await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{'Authorization':`Bearer ${k}`,'Content-Type':'application/json'},body:JSON.stringify({model:'tts-1',input:text.slice(0,4000),voice}),signal:AbortSignal.timeout(15000)})
      if(r.ok){const buf=await r.arrayBuffer();return new Response(buf,{headers:{'Content-Type':'audio/mpeg'}})}
    } catch {}
  }
  return NextResponse.json({ url:`https://text.pollinations.ai/tts?text=${encodeURIComponent(text.slice(0,500))}&voice=${voice}` })
}
