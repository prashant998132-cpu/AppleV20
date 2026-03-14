// lib/intent/fuzzy.ts — Fuzzy Intent Detection
// Voice typos, spelling mistakes, Hinglish variations — sab samjhe

// ─── Normalization ────────────────────────────────────────
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    // Common voice-to-text mistakes
    .replace(/troch|torch|torsh|torche|torcch|toch/g, 'torch')
    .replace(/flashlite|flashligt|flasjlight/g, 'flashlight')
    .replace(/batery|battry|batry|baatri|battrey/g, 'battery')
    .replace(/wiffi|wi-fi|wi fi|waifi/g, 'wifi')
    .replace(/bluetuth|blutetooth|blutooh|blutooth/g, 'bluetooth')
    .replace(/camra|camrea|cammera|camear/g, 'camera')
    .replace(/notifcation|notifiction|notif/g, 'notification')
    .replace(/watsapp|whats app|whasapp|whtsapp/g, 'whatsapp')
    .replace(/loaction|locaton|lcation/g, 'location')
    .replace(/viberat|vibrte|vibrat\b/g, 'vibrate')
    .replace(/screensot|screenshoot|screnshot/g, 'screenshot')
    .replace(/volumne|volum\b|vlume/g, 'volume')
    .replace(/\bkro\b|\bkr\b/g, 'karo')
    .replace(/\bband\b|\bbannd\b/g, 'off')
    .replace(/\bchalu\b|\bchalao\b|\bjalao\b/g, 'on')
    .replace(/\bon karo\b|\bon kar\b|\bon kr\b/g, 'on')
    .replace(/\boff karo\b|\boff kar\b/g, 'off')
}

// ─── Fuzzy match score (0-1) ──────────────────────────────
function levenshtein(a: string, b: string): number {
  if (a === b) return 1
  if (!a || !b) return 0
  const dp: number[][] = Array.from({length: a.length+1}, (_,i) =>
    Array.from({length: b.length+1}, (_,j) => i===0?j:j===0?i:0))
  for (let i=1;i<=a.length;i++)
    for (let j=1;j<=b.length;j++)
      dp[i][j] = a[i-1]===b[j-1] ? dp[i-1][j-1]
               : 1+Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  const maxLen = Math.max(a.length, b.length)
  return 1 - dp[a.length][b.length]/maxLen
}

// ─── Intent patterns ──────────────────────────────────────
interface FuzzyIntent {
  intent: string
  keywords: string[]
  patterns: RegExp[]
  action: string
}

const INTENTS: FuzzyIntent[] = [
  {
    intent: 'torch_on',
    keywords: ['torch', 'flashlight', 'light', 'roshni'],
    patterns: [/tor[ck]?h|flashl/i, /\b(on|chalu|jala|jalo|on\s*kar)\b/i],
    action: 'termux:torch on',
  },
  {
    intent: 'torch_off',
    keywords: ['torch', 'flashlight', 'light'],
    patterns: [/tor[ck]?h|flashl/i, /\b(off|band|bujha|bujhao)\b/i],
    action: 'termux:torch off',
  },
  {
    intent: 'battery',
    keywords: ['battery', 'charge', 'baatri', 'kitni charge'],
    patterns: [/bat+er?y|baatri|charge|charg/i],
    action: 'battery_check',
  },
  {
    intent: 'wifi_info',
    keywords: ['wifi', 'wi-fi', 'internet', 'network', 'ip'],
    patterns: [/wi.?fi|network|internet|ip\s*address/i],
    action: 'termux:wifi',
  },
  {
    intent: 'vibrate',
    keywords: ['vibrate', 'hila', 'buzz', 'ring'],
    patterns: [/vibr|hila|buzz/i],
    action: 'termux:vibrate',
  },
  {
    intent: 'screenshot',
    keywords: ['screenshot', 'screen shot', 'screen capture', 'capture'],
    patterns: [/screen.?shot|screen.?cap|capture/i],
    action: 'termux:screenshot',
  },
  {
    intent: 'photo',
    keywords: ['photo', 'camera', 'picture', 'selfie', 'pic'],
    patterns: [/photo|camera|picture|selfie|\bpic\b/i],
    action: 'camera',
  },
  {
    intent: 'location',
    keywords: ['location', 'gps', 'kahan hoon', 'meri jagah', 'where am i'],
    patterns: [/locat|gps|kahan|jagah|where.*am.*i/i],
    action: 'location',
  },
  {
    intent: 'call',
    keywords: ['call', 'dial', 'phone karo', 'call karo'],
    patterns: [/\b(call|dial|phone\s*kar)\b/i, /[\d]{8,}/],
    action: 'call',
  },
  {
    intent: 'whatsapp',
    keywords: ['whatsapp', 'wa', 'whats app'],
    patterns: [/wh?a?ts?.?app|^wa\b/i],
    action: 'whatsapp',
  },
  {
    intent: 'volume_up',
    keywords: ['volume up', 'awaaz badha', 'louder', 'zyada awaaz'],
    patterns: [/volum/i, /up|badha|loud|zyada/i],
    action: 'termux:volume up',
  },
  {
    intent: 'volume_down',
    keywords: ['volume down', 'awaaz kam', 'quiet', 'mute'],
    patterns: [/volum/i, /down|kam|quiet|mute|silent/i],
    action: 'termux:volume down',
  },
]

// ─── Main fuzzy detect function ───────────────────────────
export interface FuzzyResult {
  intent: string
  action: string
  confidence: number
}

export function fuzzyDetect(rawText: string): FuzzyResult | null {
  const text = normalize(rawText)
  
  for (const intent of INTENTS) {
    // Check all patterns match
    const allMatch = intent.patterns.every(p => p.test(text))
    if (allMatch) {
      return { intent: intent.intent, action: intent.action, confidence: 0.9 }
    }
    
    // Check keyword fuzzy match
    const words = text.split(' ')
    let maxScore = 0
    for (const keyword of intent.keywords) {
      for (const word of words) {
        const score = levenshtein(word, keyword)
        if (score > maxScore) maxScore = score
      }
    }
    
    // High confidence fuzzy match
    if (maxScore > 0.75) {
      // Also needs some action context (on/off/check/karo)
      const hasAction = /\b(on|off|karo|kar|check|batao|de|do|start|stop|band|chalu)\b/i.test(text)
      if (hasAction) {
        return { intent: intent.intent, action: intent.action, confidence: maxScore }
      }
    }
  }
  
  return null
}

// ─── Quick normalization for display ─────────────────────
export function getIntentLabel(action: string): string {
  const labels: Record<string, string> = {
    'termux:torch on': '🔦 Torch ON',
    'termux:torch off': '🔦 Torch OFF', 
    'battery_check': '🔋 Battery',
    'termux:wifi': '📶 WiFi',
    'termux:vibrate': '📳 Vibrate',
    'termux:screenshot': '📷 Screenshot',
    'camera': '📸 Camera',
    'location': '📍 Location',
    'call': '📞 Call',
    'whatsapp': '💚 WhatsApp',
    'termux:volume up': '🔊 Volume UP',
    'termux:volume down': '🔇 Volume DOWN',
  }
  return labels[action] || action
}
