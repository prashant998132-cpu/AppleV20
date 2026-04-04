// lib/core/fuzzy.ts — Smart typo/voice error correction
// Jaise Claude samajhta hai galat likha hua — JARVIS bhi samjhega!

// ─── Common voice/typing errors ───────────────────────────
const CORRECTIONS: [RegExp, string][] = [
  // Torch variants — voice typos: Troch, Torach, Toch, Torsh
  [/\btr?[oa]?[ur]?[oc]+h?\b/gi, 'torch'],
  [/\bfl[ae]sh\s*li[gq]ht\b/gi, 'flashlight'],
  // Battery
  [/\bba[t]+[ae]r[yi]\b/gi, 'battery'],
  [/\bch[ae]rg[ei]+ng?\b/gi, 'charging'],
  // Common Hinglish typos
  [/\bk[ae]ro\b/gi, 'karo'],
  [/\bb[ae]nd\b/gi, 'band'],
  [/\bch[ae]lu\b/gi, 'chalu'],
  [/\bon\s*k[ae]ro\b/gi, 'on karo'],
  [/\boff\s*k[ae]ro\b/gi, 'off karo'],
  // Volume
  [/\bvol[ue]+m[ea]?\b/gi, 'volume'],
  // Location  
  [/\blo[ck]+[ae]tion\b/gi, 'location'],
  [/\bgp[sz]\b/gi, 'gps'],
  // Camera/photo
  [/\bph[oa]t[oa]\b/gi, 'photo'],
  [/\bcam[ae]r[ae]\b/gi, 'camera'],
  [/\bself[iy][ae]?\b/gi, 'selfie'],
  // Vibrate
  [/\bvibr[ae]+t[ae]?\b/gi, 'vibrate'],
  // WhatsApp
  [/\bwh[ae]ts[ae]?[pa]+\b/gi, 'whatsapp'],
  [/\bw[ae]ts[ae]p\b/gi, 'whatsapp'],
  // Numbers (voice often adds spaces)
  [/(\d)\s+(\d)/g, '$1$2'],
  // Common filler words
  [/\bpl[sz]\b/gi, 'please'],
  [/\bplz\b/gi, 'please'],
  // Yaar/ya
  [/\by[ae]+r\b/gi, 'yaar'],
  // Open variations
  [/\bk[oa]l[oa]\b/gi, 'kholo'],
  [/\bkh[oa]l[oa]\b/gi, 'kholo'],
  [/\bop[ea]n\b/gi, 'kholo'],
  // Message variations (massage/messege/masage all → message)
  [/\bm[ae]ss[ai]?g[ei]?\b/gi, 'message'],
  [/\bm[ae]s[ae]j\b/gi, 'message'],
  [/\bmassage\b/gi, 'message'],
  // Send variations
  [/\bbh[ae]j[oa]\b/gi, 'bhejo'],
  [/\bs[ae]nd\b/gi, 'bhejo'],
  // Call variations
  [/\bc[ao]ll\b/gi, 'call'],
  [/\bk[ao]l\b/gi, 'call'],
  // Our → aur
  [/\bour\b/gi, 'aur'],
  // Karo variations
  [/\bk[ae]r[oa]\b/gi, 'karo'],
]

// ─── Normalize text ────────────────────────────────────────
export function fuzzyNormalize(text: string): string {
  let t = text
  for (const [re, fix] of CORRECTIONS) {
    t = t.replace(re, fix)
  }
  return t.trim()
}

// ─── Smart intent keywords (handles typos) ────────────────
const INTENT_KEYWORDS: Record<string, RegExp> = {
  torch_on:  /\btor?c?h\b.*\b(on|chalu|jala|laga|karo)\b|\b(on|chalu|jala)\b.*\btor?c?h\b/i,
  torch_off: /\btor?c?h\b.*\b(off|band|bujha|bnd)\b|\b(off|band)\b.*\btor?c?h\b/i,
  battery:   /\bba[t]+[ae]?r[yi]?\b|\bcharge\s*(kitna|check|dekh)\b/i,
  vibrate:   /\bvibr|buzz|hila\b/i,
  location:  /\blo[ck]+[ae]?tion\b|\bgps\b|\bkahan\s*hoon\b/i,
  photo:     /\bphoto\b|\bcamera\b|\bselfie\b|\bpic\b/i,
  volume_up: /\bvolume?\b.*(up|badha|zyada|max)\b/i,
  volume_dn: /\bvolume?\b.*(down|kam|ghata|mute|zero)\b/i,
  call:      /\bcall\s*karo?\b|\bdial\b/i,
  navigate:  /\bnavigate?\b|\brasta\s*batao\b|\ble\s*chalo\b/i,
}

export function detectIntent(text: string): string | null {
  // Short commands only - not sentences
  if (text.trim().split(/\s+/).length > 8) return null

  const t = text.toLowerCase()
  for (const [intent, re] of Object.entries(INTENT_KEYWORDS)) {
    if (re.test(t)) return intent
  }
  return null
}

// ─── Map intent to Termux command ─────────────────────────
export function intentToTermuxCmd(intent: string): { cmd: string; label: string } | null {
  const MAP: Record<string, { cmd: string; label: string }> = {
    torch_on:  { cmd: 'termux-torch on',         label: '🔦 Torch ON' },
    torch_off: { cmd: 'termux-torch off',         label: '🔦 Torch OFF' },
    battery:   { cmd: 'termux-battery-status',    label: '🔋 Battery' },
    vibrate:   { cmd: 'termux-vibrate -d 500 -f', label: '📳 Vibrate' },
    location:  { cmd: 'termux-location -p gps -r once', label: '📍 Location' },
    photo:     { cmd: 'termux-camera-photo /sdcard/JARVIS_$(date +%s).jpg && echo "Saved!"', label: '📸 Photo' },
    volume_up: { cmd: 'termux-volume music 15',   label: '🔊 Volume UP' },
    volume_dn: { cmd: 'termux-volume music 0',    label: '🔇 Volume OFF' },
  }
  return MAP[intent] || null
}
