import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'edge'
export async function POST(req: NextRequest) {
  const { prompt, width=512, height=512, model='flux' } = await req.json()
  if (!prompt) return NextResponse.json({ error:'No prompt' },{status:400})
  const seed = Math.floor(Math.random()*99999)
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&model=${model}&nologo=true&seed=${seed}&enhance=true`
  return NextResponse.json({ url, provider:'Pollinations', model, seed })
}
