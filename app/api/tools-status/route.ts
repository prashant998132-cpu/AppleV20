// app/api/tools-status/route.ts — JARVIS Tool System Status
import { NextRequest, NextResponse } from 'next/server'
import { detectIntent } from '../../../lib/tools/intent'
import { TOOL_REGISTRY, getToolsByCategory } from '../../../lib/tools/registry'
import { cacheStats, cacheEvict } from '../../../lib/tools/cache'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const testQuery = url.searchParams.get('q')

  // Evict expired cache entries
  const evicted = cacheEvict()

  const stats = cacheStats()
  const registry = {
    total: TOOL_REGISTRY.length,
    noKey: TOOL_REGISTRY.filter(t => !t.requiresKey).length,
    requiresKey: TOOL_REGISTRY.filter(t => t.requiresKey).length,
    categories: [...new Set(TOOL_REGISTRY.map(t => t.category))].reduce((acc, cat) => {
      acc[cat] = getToolsByCategory(cat as any).length
      return acc
    }, {} as Record<string, number>),
    capacity: '150+ slots designed',
  }

  const result: any = { registry, cache: { ...stats, evicted }, architecture: {
    old: '5 Gemini calls/query · 33 tools loaded always · 0 cache',
    new: '1 Gemini call/query · 2 tools max · category lazy-load · TTL cache',
    savings: 'Up to 80% fewer Gemini API calls',
  }}

  // Test intent detection if query provided
  if (testQuery) {
    const intent = detectIntent(testQuery)
    result.intent_test = { query: testQuery, ...intent }
  }

  return NextResponse.json(result, { headers: { 'Content-Type': 'application/json' } })
}
