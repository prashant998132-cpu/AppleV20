export interface ToolDefinition {
  name: string
  description: string
  category: string
  requiresKey: boolean
  autoTrigger: string[]
  inputSchema: {
    type: string
    properties: Record<string, any>
    required?: string[]
  }
  envKey?: string  // optional - for free-key tools
}
