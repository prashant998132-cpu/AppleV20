// lib/proactive/engine.ts — Proactive Engine v4 — JARVIS khud sochta hai
import { getSetting, setSetting } from '../db'

export interface ProactiveEvent {
  type: string; message: string; priority: 'high'|'medium'|'low'
  action?: string; actionLabel?: string
}

const KEY = 'jarvis_profile_v4'

interface Profile {
  topics: string[]; hours: number[]; streak: number
  lastDate: string; totalChats: number; lastTopics: string[]
  mood: string; recentCommands: string[]
}

function load(): Profile {
  try { return JSON.parse(localStorage.getItem(KEY)||'null') || blank() } catch { return blank() }
}
function save(p: Profile) { try { localStorage.setItem(KEY, JSON.stringify(p)) } catch {} }
function blank(): Profile {
  return { topics:[], hours:[], streak:0, lastDate:'', totalChats:0, lastTopics:[], mood:'neutral', recentCommands:[] }
}

export async function trackHabit(msg: string): Promise<void> {
  const p = load(); const l = msg.toLowerCase(); const h = new Date().getHours()
  if (!p.hours.includes(h)) p.hours = [...p.hours, h].slice(-24)
  const today = new Date().toDateString()
  if (p.lastDate !== today) {
    p.streak = p.lastDate === new Date(Date.now()-86400000).toDateString() ? p.streak+1 : 1
    p.lastDate = today; p.totalChats++
  }
  // Topic detection
  const tm: [RegExp,string][] = [
    [/code|debug|react|python|javascript|typescript|node|api/,'coding'],
    [/padh|study|exam|chapter|notes|revision|neet|jee|upsc/,'studying'],
    [/anime|manga|otaku/,'anime'],[/music|song|gana|spotify/,'music'],
    [/gym|workout|exercise|yoga|run/,'fitness'],[/news|khabar/,'news'],
    [/crypto|bitcoin|stock|invest/,'finance'],[/movie|netflix|series/,'entertainment'],
    [/game|gaming|pubg|valorant/,'gaming'],[/image|photo|design/,'creative'],
  ]
  for (const [r,t] of tm) if (r.test(l)) { p.lastTopics=[t,...p.lastTopics.filter(x=>x!==t)].slice(0,5); if(!p.topics.includes(t)) p.topics=[t,...p.topics].slice(0,10) }
  // Mood detection
  if (/frustrated|bored|thak|bore|pagal|problem/i.test(l)) p.mood='low'
  else if (/mast|great|achha|sahi|perfect|done|ho gaya/i.test(l)) p.mood='high'
  else p.mood='neutral'
  save(p)
}

export async function checkProactive(): Promise<ProactiveEvent|null> {
  const p = load(); const h = new Date().getHours()
  // Morning briefing
  if (h>=7&&h<=9&&Math.random()<0.6) return { type:'time', message:'Subah ho gayi! ☀️ Aaj ka briefing ready hai — weather, crypto, news sab.', priority:'high', action:'/briefing', actionLabel:'Briefing Dekho' }
  // Late night
  if ((h>=23||h<4)&&Math.random()<0.5) return { type:'time', message:'Raat ke '+h+' baj rahe hain yaar. Neend bhi zaruri hai! 😴', priority:'medium' }
  // Study time
  if (p.topics.includes('studying')&&h>=14&&h<=18&&Math.random()<0.4) return { type:'habit', message:'Study time ho gaya! Kya padhna hai aaj? 📚', priority:'medium', action:'Aaj kya padhna hai?', actionLabel:'Study Shuru' }
  // Streak
  if (p.streak>0&&p.streak%7===0) return { type:'streak', message:`🔥 ${p.streak} din ka streak! Solid chal raha hai yaar!`, priority:'high' }
  // Low mood
  if (p.mood==='low'&&Math.random()<0.4) return { type:'mood', message:'Kuch stuck lag raha hai? Batao — solve karte hain ya bas baat karte hain.', priority:'medium' }
  // Topic continuation  
  if (p.lastTopics.length>0&&Math.random()<0.25) {
    const msgs: Record<string,string> = { coding:'Pichla code kaise gaya? Koi bug? 💻', studying:'Padhai kaise chal rahi hai? 📖', anime:'Koi naya anime shuru kiya? 🌸', finance:'Aaj market ka kya scene hai? 📈', creative:'Koi naya design/image banana hai? 🎨' }
    const m = msgs[p.lastTopics[0]]
    if (m) return { type:'topic', message:m, priority:'low' }
  }
  return null
}

export async function generateDailySummary(): Promise<string> {
  const p = load()
  return `${p.totalChats} conversations • ${p.streak} day streak • Topics: ${p.topics.slice(0,3).join(', ')||'diverse'}`
}
