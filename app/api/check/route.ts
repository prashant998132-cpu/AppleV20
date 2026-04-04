// app/api/check/route.ts — Check which server API keys are configured
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET() {
  const keys = {
    groq:       !!process.env.GROQ_API_KEY,
    gemini:     !!process.env.GEMINI_API_KEY,
    together:   !!process.env.TOGETHER_API_KEY,
    openrouter: !!process.env.OPENROUTER_API_KEY,
  }
  const hasKeys = Object.values(keys).some(Boolean)
  return Response.json({ hasKeys, keys })
}
