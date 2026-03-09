# 🤖 JARVIS AI — GOLDEN MASTER DOCUMENT
## Naye chat ke liye complete context — paste karo, sab samajh aayega

> **Version:** v20 (Upgraded)  
> **Developer:** Prashant (Mayur) · Nadan village, Maihar, Madhya Pradesh  
> **Stack:** Next.js 14 + TypeScript + Puter.js + Vercel  
> **Repo:** github.com/prashant998132-cpu/AppleV20  
> **Live:** apple-v20.vercel.app  
> **Monthly Cost:** ₹0

---

## 🏆 GOLDEN RULES — KABHI MAT TOODO

### 1️⃣ VERCEL LIMIT KABHI KHATAM NAHI HOGI — IF YOU FOLLOW THIS
```
❌ GALAT: Image/video/audio → Vercel se serve karo
✅ SAHI:  Image → Pollinations URL (unka server)
✅ SAHI:  Music → Deezer preview URL (unka server)
✅ SAHI:  Video → YouTube embed URL (unka server)
✅ SAHI:  Storage → Puter cloud (user ka 1GB FREE)
✅ SAHI:  API responses → Sirf JSON, koi file nahi

RULE: "Vercel sirf text/JSON bhejta hai. Files kabhi nahi."
Agar yeh rule follow karo → 1,00,000 executions/month FREE → kabhi khatam nahi.
```

### 2️⃣ SMART ROUTER — Credit aware cascade
```
Flash (normal chat):
L1: Groq llama-3.1-8b    → FREE 14,400/day · FASTEST
L2: Groq llama-3.3-70b   → FREE 1,000/day
L3: Together AI 70B       → $25 free credit
L4: Gemini 2.0 Flash      → FREE 1,500/day
L5: Puter GPT-4o-mini     → User ka account · FREE

Think (reasoning):
T1: DeepSeek R1 OpenRouter → $0.55/1M tokens
T2: Gemini Flash Thinking  → FREE 50/day
T3: Puter GPT-4o           → FREE

Image:
I1: Puter DALL-E 3        → FREE (user account)
I2: Pollinations Flux     → FREE forever · URL only
I3: Pollinations Turbo    → FREE forever

MONTHLY COST = ₹0 if only Groq + Gemini keys used.
```

### 3️⃣ INLINE RICH CARDS — ChatGPT jaisa
```
Tu likhta hai        → Chat mein result aata hai
─────────────────────────────────────────────
"image banao"        → 🖼️ Image card (Pollinations URL, ZERO bandwidth)
"Arijit song"        → 🎵 Music card + 30-sec preview player (Deezer URL)
"movie kaisi hai"    → 🎬 Movie card — poster, rating, plot (TMDB/OMDB URL)
"mausam batao"       → 🌤️ Weather card — temp, humidity, wind
"poster banao"       → 🎨 Canva card → direct edit link
"wolfram solve"      → 🧮 Wolfram embed
"youtube video"      → ▶️ YouTube embed player
"github trending"    → 🐙 GitHub repo card
"news batao"         → 📰 Clickable news cards
"book recommend"     → 📚 Book card with read link
"desmos graph"       → 📈 Desmos interactive embed
```

### 4️⃣ TOOL SYSTEM — Credit saving
```
Intent detection: <1ms, ZERO API, 20 categories
Tool cache: TTL-based LRU → 70-80% API calls saved
Max 2 tools per query → Gemini prompt chhota
No-key tools first → paid tools last resort
Lazy module loading → sirf needed category load
History limit: 8-10 messages → smaller context
```

### 5️⃣ STORAGE — 6 layers, zero waste
```
IndexedDB (Dexie)   → Chats, Memory, Profile · OFFLINE ✅
Puter Cloud         → Images, Audio, Video · 1GB FREE ✅
localStorage        → API Keys, Settings · 5MB ✅
Tool Cache (LRU)    → Weather/News results · in-memory ✅
Supabase (optional) → Cross-device sync · FREE 500MB ✅
Firebase (optional) → Realtime · FREE ✅
```

### 6️⃣ PERSONALITY — Jons Bhai
```
Name: JARVIS — "Jons Bhai"
Tone: Hinglish, sarcastic but caring, Tony Stark attitude
Rules:
- 1-3 lines max reply (jab tak explain nahi maanga)
- "As an AI" kabhi mat kaho
- Math → seedha number (18% of 4500 → 810)
- KaTeX math: $formula$ aur $$display$$
- [LEARN: type=data] format mein user facts note karo
- NEET/JEE context aware
```

### 7️⃣ NAVIGATION — J logo tap
```
Bottom nav HATA DIYA hai.
"J" logo (header mein top-left) tap karo → Slide-up drawer khulega
Drawer mein: Chat · Study · Studio · Apps · India Hub · Media · Voice · Settings
```

---

## 📁 COMPLETE FILE STRUCTURE (164 files)

```
JARVIS-FINAL-V2/
├── app/
│   ├── page.tsx                    ← MAIN CHAT (rich cards, smart chips, export)
│   ├── layout.tsx                  ← Puter.js + KaTeX CDN
│   ├── india/page.tsx              ← 🇮🇳 India Hub (IFSC, PNR, Pincode, Fuel)
│   ├── study/page.tsx              ← 📚 NEET Quiz + Formula Sheet
│   ├── apps/page.tsx               ← 🔗 Apps Hub (150+ apps, 20 categories)
│   ├── media/page.tsx              ← 📁 Media Gallery (Puter cloud)
│   ├── studio/page.tsx             ← 🎨 AI Studio (image/music/voice)
│   ├── settings/page.tsx           ← ⚙️ 27 API keys + Profile + Memory
│   ├── briefing/page.tsx           ← 📰 Daily Briefing
│   ├── canva/page.tsx              ← Canva AI Integration
│   ├── voice/page.tsx              ← 🎤 Voice Mode
│   ├── tools/page.tsx              ← Tools Explorer
│   ├── system/page.tsx             ← 📊 System Dashboard
│   └── api/
│       ├── jarvis/stream/route.ts      ← Flash/Think mode SSE
│       ├── jarvis/deep-stream/route.ts ← Deep mode + tools + rich cards
│       └── tools-status/route.ts       ← Debug endpoint
│
├── lib/
│   ├── core/smartRouter.ts         ← 14 providers, credit tracking
│   ├── tools/intent.ts             ← <1ms detection, 20 categories
│   ├── tools/registry.ts           ← 50 tool definitions
│   ├── tools/connected/index.ts    ← 49 connected API tools
│   ├── tools/no-key/index.ts       ← 17 no-key tools
│   ├── tools/free-key/index.ts     ← 11 free-key tools
│   ├── integrations/mega.ts        ← 150+ apps, 20 categories, 558 actions
│   ├── db/index.ts                 ← Dexie.js IndexedDB
│   ├── personality/index.ts        ← Jons Bhai character
│   └── memory/extractor.ts         ← [LEARN:] tag processor
│
└── components/shared/
    ├── NavDrawer.tsx               ← Slide-up nav (8 pages)
    ├── BottomNav.tsx               ← Returns null (removed)
    └── Toast.tsx                   ← Notifications
```

---

## 🔧 TOOLS — 77 Total

### Intent Categories (20)
`weather · time · news · finance · knowledge · location · india · education · entertainment · image_gen · productivity · science · health · sports · food · fun · search · code · travel · none`

### No-Key Tools (17 — always work)
`weather, datetime, wikipedia, location, word_meaning, holidays, sunrise_sunset, pincode, translate, recipe, joke, ISS_location, books, image_fast, reddit, hackernews, calculate`

### Connected Tools (49 — v19 new)
```
No Key: github_trending, npm_search, deezer_search (30-sec MP3!), omdb_search,
        tenor_gifs, anime_search, openlib, stackoverflow, leetcode_stats,
        chess_stats, country_info, ip_info, exchange_rate, synonyms, rhymes

Free Key: tmdb_search, giphy_search, pexels, unsplash, lastfm, spotify_search,
          notion_search, todoist, youtube_api, guardian_news, github_my_repos
```

---

## 🎨 INLINE CARDS — sab external URLs, zero Vercel bandwidth

| Card Type | Source | Vercel Bandwidth |
|-----------|--------|-----------------|
| Image     | Pollinations.ai URL | 0 bytes |
| Music     | Deezer CDN URL | 0 bytes |
| Movie poster | OMDB/TMDB URL | 0 bytes |
| GIF       | Tenor/Giphy URL | 0 bytes |
| Weather   | JSON only | ~1KB |
| GitHub    | JSON only | ~1KB |
| News      | JSON only | ~2KB |
| Canva     | Redirect link | 0 bytes |
| YouTube   | embed URL | 0 bytes |
| Wolfram   | embed URL | 0 bytes |

**Total: ~₹0 bandwidth cost forever**

---

## 🔑 API KEYS (Minimum required)
```
GROQ_API_KEY=gsk_...              # FREE · console.groq.com/keys
GEMINI_API_KEY=AIza...            # FREE · aistudio.google.com/apikey
NEXT_PUBLIC_GEMINI_API_KEY=AIza...# Same as above
```

---

## 📊 SYSTEM DASHBOARD (/system)

Dashboard **intact hai** — yahan sab dikh raha hai:
- **AI Providers tab** — 14 providers, daily usage, cost tracker
- **Storage tab** — 6 layers, Puter 1GB usage
- **Smart Route tab** — cascade order, credit saving strategies
- **GitHub tab** — deploy guide, repo link

---

## ⏳ PENDING (v21 ke liye)

```
HIGH PRIORITY:
□ Python code runner (Pyodide.js — NEET calculations)
□ Periodic Table interactive (/periodic)
□ Formula Sheet PDF export
□ NEET PYQ finder (previous year papers)
□ Chat PDF export (jsPDF)

MEDIUM:
□ Voice TTS auto-speak toggle
□ Memory manual boost (+3 importance)
□ Weekly review trigger (Sunday auto)
□ India Hub — real PNR API (railwayapi.site)
□ More inline cards: Google Maps embed, Replit embed

LOW:
□ 100 tools target (need 23 more)
□ Cloudinary backup (when Puter 1GB full)
□ smartRouter.ts → wire into live routing
```

---

## 🚀 RESUME INSTRUCTIONS

```bash
# Repo clone:
git clone https://github.com/prashant998132-cpu/AppleV20.git
cd AppleV20
npm install
cp .env.example .env.local   # Fill GROQ_API_KEY + GEMINI_API_KEY
npm run dev                   # localhost:3000

# Push changes:
git add . && git commit -m "feat: ..." && git push origin main
# Vercel auto-deploys in 2-3 min

# Debug tools:
GET /api/tools-status?q=weather+delhi
GET /system   → System Dashboard
```

---

## 📈 PROJECT STATS
```
Files:        164 source files
Pages:        10 UI + 7 API routes
Tools:        77 (17 + 11 + 49)
Apps:         150+ · 20 categories · 558 actions
API Keys:     27 optional + 2 required minimum
Inline Cards: 10 types (image/music/movie/weather/github/news/canva/book/gif/wolfram)
AI Cascade:   14 providers (5 Flash + 3 Think + 3 Image + 2 Storage + TTS)
Monthly Cost: ₹0
Nav:          J logo tap → 8-page slide drawer
```

*JARVIS v20 — Har naye chat mein yeh file paste karo*
*"Jons Bhai zinda hai" 🤖*
