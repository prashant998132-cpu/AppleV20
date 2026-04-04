// lib/core/toolSafety.ts — Tool safety: cooldown + validation + log
const COOLDOWN_KEY = 'jarvis_tool_cooldowns'
const TOOL_LOG_KEY = 'jarvis_tool_log'
const MAX_LOG = 50

interface ToolCall { tool: string; ts: number; success: boolean }

function getCooldowns(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(COOLDOWN_KEY) || '{}') } catch { return {} }
}

export function canCallTool(tool: string, cooldownMs = 30000): boolean {
  const cd = getCooldowns()
  const last = cd[tool] || 0
  return Date.now() - last > cooldownMs
}

export function markToolUsed(tool: string): void {
  const cd = getCooldowns()
  cd[tool] = Date.now()
  try { localStorage.setItem(COOLDOWN_KEY, JSON.stringify(cd)) } catch {}
}

export function logToolCall(tool: string, success: boolean): void {
  try {
    const log: ToolCall[] = JSON.parse(localStorage.getItem(TOOL_LOG_KEY) || '[]')
    log.unshift({ tool, ts: Date.now(), success })
    if (log.length > MAX_LOG) log.splice(MAX_LOG)
    localStorage.setItem(TOOL_LOG_KEY, JSON.stringify(log))
  } catch {}
}

export function getToolLog(): ToolCall[] {
  try { return JSON.parse(localStorage.getItem(TOOL_LOG_KEY) || '[]') } catch { return [] }
}

// Max 3 tool calls per message enforced at orchestrator level
export function createCallCounter() {
  let count = 0
  return {
    canCall: () => count < 3,
    increment: () => { count++; return count },
    reset: () => { count = 0 }
  }
}

// Input validation before tool execution
export function validateToolInput(tool: string, input: any): { valid: boolean; error?: string } {
  if (!tool || typeof tool !== 'string') return { valid: false, error: 'Tool name missing' }
  if (tool.includes('..') || tool.includes('/')) return { valid: false, error: 'Invalid tool name' }
  return { valid: true }
}
