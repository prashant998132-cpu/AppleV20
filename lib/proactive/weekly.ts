// lib/proactive/weekly.ts — Weekly summary (every Sunday)
import { getImportantMemories } from '../db'

const WEEKLY_KEY = 'jarvis_weekly_summary_date'

export function shouldShowWeeklySummary(): boolean {
  const now = new Date()
  if (now.getDay() !== 0) return false  // Only Sunday
  if (now.getHours() < 19) return false  // After 7 PM
  const lastDate = localStorage.getItem(WEEKLY_KEY)
  const thisWeek = `${now.getFullYear()}-W${Math.ceil(now.getDate() / 7)}`
  return lastDate !== thisWeek
}

export async function generateWeeklySummary(): Promise<string> {
  const now = new Date()
  const thisWeek = `${now.getFullYear()}-W${Math.ceil(now.getDate() / 7)}`
  localStorage.setItem(WEEKLY_KEY, thisWeek)

  // Get memories from this week
  const memories = await getImportantMemories(3, 20).catch(() => [] as any[])
  const recentFacts = memories.slice(0, 5).map((m: any) => m.data).join(', ')

  const chatCount = parseInt(localStorage.getItem('jarvis_weekly_chat_count') || '0')
  localStorage.setItem('jarvis_weekly_chat_count', '0')  // Reset

  const lines = [
    `Is hafte ka wrap-up! 📊`,
    `${chatCount} conversations hue JARVIS ke saath.`,
    recentFacts ? `Yeh cheezein yaad rahi: ${recentFacts.slice(0, 100)}` : '',
    `Agli hafte aur bhi productive ho — teri capacity dekhi hai main ne! 💪`,
  ].filter(Boolean)

  return lines.join(' ')
}

export function trackWeeklyChat(): void {
  const count = parseInt(localStorage.getItem('jarvis_weekly_chat_count') || '0')
  localStorage.setItem('jarvis_weekly_chat_count', String(count + 1))
}
