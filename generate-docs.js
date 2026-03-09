#!/usr/bin/env node
// JARVIS Master Documentation Generator
// Run: node generate-docs.js
// Output: JARVIS-MASTER-DOC.md

const fs = require('fs')

const doc = `# 🤖 JARVIS AI — Master Project Document
## Complete Context for New Chat Sessions

> **Version:** v19 (Connected APIs)  
> **Date:** March 2026  
> **Developer:** Mayur (NEET student, Nadan village, Maihar, Madhya Pradesh)  
> **Stack:** Next.js 14 + TypeScript + Puter.js + Vercel  
> **Latest ZIP:** JARVIS-v19-Connected.zip (369KB, 159 files)

---

## 🎯 WHAT IS JARVIS?

JARVIS ek **PWA (Progressive Web App)** hai — Tony Stark wala AI assistant, Mayur ke liye banaya gaya.

**Personality:** "Jons Bhai" — Hinglish, sarcastic but caring, NEET-focused, India-aware  
**Tech:** Multi-LLM cascade (Groq → Together → Gemini → Puter), 100+ tools, 150+ apps  
**Cost:** $0/month if Groq + Gemini free keys use karo  
**Deploy:** Vercel pe auto-deploy hota hai GitHub se

---

## 📁 COMPLETE FILE STRUCTURE

\`\`\`
JARVIS-FINAL-V2/
│
├── app/                          ← Next.js pages (App Router)
│   ├── page.tsx                  ← Main Chat page (/) — MOST IMPORTANT
│   ├── layout.tsx                ← Root layout, Puter.js script inject
│   ├── apps/page.tsx             ← Apps Hub (150+ apps, 20 categories)
│   ├── media/page.tsx            ← Media Gallery (images/audio/video)
│   ├── studio/page.tsx           ← AI Studio (image/music/voice gen)
│   ├── settings/page.tsx         ← API keys + Profile + Memory
│   ├── briefing/page.tsx         ← Daily Briefing
│   ├── canva/page.tsx            ← Canva AI Integration
│   ├── voice/page.tsx            ← Voice Mode
│   ├── tools/page.tsx            ← Tools Explorer
│   ├── system/page.tsx           ← System Dashboard (NEW v18)
│   └── api/
│       ├── jarvis/route.ts       ← Non-streaming AI (fallback)
│       ├── jarvis/stream/route.ts    ← SSE: 4-level cascade (Groq→Together→Gemini→Puter)
│       ├── jarvis/deep-stream/route.ts ← SSE: Autonomous tools (v18 main route)
│       ├── tools-status/route.ts ← Debug: GET /api/tools-status?q=query
│       ├── tts/route.ts          ← Text-to-Speech API
│       ├── fetch-url/route.ts    ← URL proxy
│       └── image/route.ts        ← Image gen proxy
│
├── lib/                          ← All business logic
│   ├── core/
│   │   ├── orchestrator.ts       ← Main AI orchestrator
│   │   ├── smartRouter.ts        ← Credit-aware provider routing (NEW v18)
│   │   └── toolSafety.ts         ← Tool safety checks
│   │
│   ├── tools/                    ← Tool system (v18 Autonomous)
│   │   ├── intent.ts             ← <1ms intent detection, 20 categories, ZERO API
│   │   ├── registry.ts           ← 50 tool definitions, metadata only
│   │   ├── cache.ts              ← LRU cache, TTL per tool, module singleton
│   │   ├── executor.ts           ← Autonomous pipeline, fallback chains
│   │   ├── no-key/index.ts       ← 17 tools, NO API key needed (679 lines)
│   │   ├── free-key/index.ts     ← 11 tools, FREE tier keys (518 lines)
│   │   ├── connected/index.ts    ← 49 NEW tools (GitHub/Deezer/TMDB etc) (NEW v19)
│   │   └── categories/           ← 22 lazy-loaded modules
│   │       ├── weather.ts, time.ts, news.ts, finance.ts
│   │       ├── knowledge.ts, location.ts, india.ts, education.ts
│   │       ├── entertainment.ts, image_gen.ts, productivity.ts
│   │       ├── science.ts, health.ts, sports.ts, food.ts
│   │       ├── fun.ts, search.ts, travel.ts, media.ts (NEW)
│   │       ├── dev.ts (NEW), music.ts (NEW), books.ts (NEW)
│   │
│   ├── integrations/
│   │   ├── mega.ts               ← 150+ apps, 20 categories, 558 actions (NEW v19)
│   │   ├── apps.ts               ← Old app registry (still used by old code)
│   │   └── canva.ts              ← Canva deep integration
│   │
│   ├── db/index.ts               ← Dexie.js IndexedDB (5 stores: Chat, Memory, Profile, Settings, Cache)
│   ├── providers/
│   │   ├── puter.ts              ← Puter.js AI provider (GPT-4o, DALL-E 3, TTS, 1GB storage)
│   │   ├── syncManager.ts        ← 3-layer sync: IndexedDB → Supabase → localStorage queue
│   │   ├── tts.ts                ← TTS cascade: Puter → OpenAI → Browser
│   │   ├── image.ts              ← Image gen cascade
│   │   └── firebase.ts           ← Firebase optional sync
│   │
│   ├── media/
│   │   ├── mediaStore.ts         ← IndexedDB: metadata + thumbnail ONLY
│   │   ├── puterStorage.ts       ← Puter cloud: actual files (ZERO Vercel bandwidth)
│   │   ├── image.ts              ← Image processing
│   │   ├── compress.ts           ← Compression (120x120 thumbnails)
│   │   ├── tts.ts                ← Audio generation
│   │   ├── music.ts              ← Music generation (HuggingFace MusicGen)
│   │   └── aiTagger.ts           ← AI auto-tagging for media
│   │
│   ├── memory/
│   │   ├── extractor.ts          ← Extract memories from chat
│   │   └── vectorSearch.ts       ← Semantic memory search
│   │
│   ├── chat/
│   │   ├── slashCommands.ts      ← 27 slash commands (/nasa, /wiki, /img, etc.)
│   │   └── autoTitle.ts          ← Auto-generate chat titles
│   │
│   ├── reminders/index.ts        ← Reminder system (localStorage + notification)
│   ├── personality/index.ts      ← Jons Bhai personality engine
│   ├── proactive/engine.ts       ← Proactive suggestions engine
│   ├── proactive/weekly.ts       ← Weekly review trigger
│   ├── render/markdown.ts        ← KaTeX math + Markdown rendering
│   ├── offline/status.ts         ← Offline detection
│   └── theme.ts                  ← Dark theme variables
│
├── components/shared/
│   ├── BottomNav.tsx             ← 5-tab navigation (Chat/Media/Studio/Apps/Settings)
│   └── Toast.tsx                 ← Toast notifications
│
├── types/jarvis.types.ts         ← Global TypeScript types
├── config/tools.config.ts        ← Tool configuration
├── .env.local                    ← API keys (copy template below)
├── package.json                  ← Next.js 14, Dexie, KaTeX deps
└── next.config.js                ← Build config
\`\`\`

---

## 🤖 AI CASCADE — Cost-Optimized

### Flash Mode (normal chat)
\`\`\`
L1: Groq llama-3.1-8b   → FREE, 14,400/day, FASTEST
L2: Groq llama-3.3-70b  → FREE, 1,000/day, better quality
L3: Together AI 70B      → $25 free credit, then $0.0009/1K tokens
L4: Gemini 2.0 Flash     → FREE, 1,500/day, tool support
L5: Puter GPT-4o-mini    → User's account, browser-side last resort
\`\`\`

### Think Mode (complex reasoning)
\`\`\`
T1: DeepSeek R1 (OpenRouter) → $0.55/1M tokens, best reasoning
T2: Gemini Flash Thinking    → FREE 50/day
T3: Puter GPT-4o             → User's account, free
\`\`\`

### Deep Mode (tools + real-time data)
\`\`\`
Route: /api/jarvis/deep-stream
1. Intent detection (<1ms, zero API)
2. Tool pre-fetch (parallel, cached)
3. Single Gemini 2.0 Flash call with injected data
→ ~80% fewer API calls vs old system
\`\`\`

---

## 🗄️ STORAGE ARCHITECTURE

\`\`\`
Layer 1: IndexedDB (Dexie)      ← Chats, Memory, Profile, Reminders — OFFLINE, FREE
Layer 2: Puter Cloud            ← Images, Audio, Music, Video — User's 1GB FREE
Layer 3: localStorage           ← API Keys, Settings, Sync queue — Browser local
Layer 4: Tool Cache (LRU)       ← Weather/News/Crypto results, TTL-based
Layer 5: Supabase (optional)    ← Cross-device sync, FREE 500MB
Layer 6: Firebase (optional)    ← Real-time sync, FREE Spark tier

RULE: Vercel se KABHI media byte nahi jaata
      Images = Puter URL ya Pollinations URL only
      IndexedDB = metadata + 120×120 thumbnail ONLY
\`\`\`

**Puter folder structure:**
\`\`\`
/jarvis-pro/
  ├── images/   ← AI-generated + user photos
  ├── audio/    ← TTS audio files
  ├── music/    ← MusicGen outputs
  ├── video/    ← Videos
  ├── canvas/   ← Canvas drawings
  └── docs/     ← Documents
\`\`\`

---

## 🔧 TOOL SYSTEM (v18 Autonomous)

### Intent Categories (20 types)
\`weather | time | news | finance | knowledge | location | india | education | entertainment | image_gen | productivity | science | health | sports | food | fun | search | code | travel | none\`

### Tool Counts
| File | Count | Notes |
|------|-------|-------|
| no-key/index.ts | 17 tools | Always work, zero setup |
| free-key/index.ts | 11 tools | Free API keys |
| connected/index.ts | 49 tools | GitHub/TMDB/Deezer etc (NEW v19) |
| **Total** | **77 tools** | Across 22 categories |

### No-Key Tools (always free)
\`get_weather, get_datetime, search_wikipedia, get_location_info, get_word_meaning,
get_public_holidays, get_sunrise_sunset, lookup_pincode, translate_text, get_recipe,
get_joke, get_iss_location, search_books, generate_image_fast, get_reddit_posts,
get_hackernews, calculate\`

### New Connected Tools (v19, no key)
\`github_trending, github_repo, github_user, npm_search, pypi_search,
deezer_search, deezer_chart (30-sec preview MP3!), musicbrainz_artist,
omdb_search, tenor_gifs, anime_search (Jikan/MAL), openlib_search,
gutenberg_search, stackoverflow_search, codeforces_user, leetcode_stats,
chess_stats, country_info, ip_info, exchange_rate_free, get_synonyms,
get_rhymes, wikipedia_image, unsplash_random\`

### New Connected Tools (v19, free key)
\`tmdb_search, tmdb_trending (TMDB key), giphy_search (Giphy key),
pexels_search/videos (Pexels key), unsplash_search (Unsplash key),
pixabay_search (Pixabay key), lastfm_artist_info/charts (Last.fm key),
spotify_search (Spotify Client ID+Secret), github_my_repos/create_issue (GitHub token),
notion_search (Notion key), todoist_tasks/add_task (Todoist token),
youtube_search_api (YT key), guardian_news (Guardian key)\`

### Cache TTLs
\`weather=900s | crypto=120s | news=600s | forex=3600s | wiki=86400s | ISS=30s\`

---

## 🚀 APPS HUB (v19 — 150+ apps, 20 categories)

### All Categories
| Category | Apps | Key Apps |
|----------|------|---------|
| 🤖 AI Tools | 12 | ChatGPT, Gemini, Claude, Perplexity, Groq, HuggingFace, OpenRouter |
| 🎨 Design & Art | 12 | Canva, Figma, Excalidraw, Midjourney, Leonardo, Freepik, Coolors |
| 💻 Code & Dev | 15 | GitHub, VS Code Web, Replit, StackBlitz, Vercel, Netlify, npm |
| 🎵 Media & Music | 12 | YouTube, Spotify, Deezer, Audiomack, MusicBrainz, Last.fm, Shazam |
| 📷 Photos & Video | 10 | Unsplash, Pexels, Pixabay, Giphy, Tenor, Imgur, Squoosh |
| 📝 Docs & Notes | 10 | Google Docs, Notion, Obsidian, HackMD, Overleaf (LaTeX!), Pastebin |
| ⚡ Productivity | 10 | Google Calendar, Trello, Todoist, Airtable, Zapier, n8n, ClickUp |
| 💬 Communication | 8 | WhatsApp, Telegram, Gmail, Discord, Slack, Twitter/X, LinkedIn |
| 🇮🇳 India | 12 | IRCTC, GPay, PhonePe, DigiLocker, NTA(NEET/JEE), Zerodha, Groww |
| 🎓 Education | 8 | Wolfram Alpha, Desmos, Khan Academy, PW, Unacademy, Coursera |
| 💹 Finance | (Moneycontrol, Zerodha, Groww) | — |
| ☁️ Cloud & Storage | 6 | Google Drive, Dropbox, Puter, WeTransfer, MEGA, OneDrive |
| 🎬 Entertainment | 8 | Netflix, JioCinema, Prime, TMDB, JustWatch, IMDB, Archive.org |
| 🔧 Developer Tools | 8 | StackOverflow, Postman, Swagger, Supabase, Firebase, ngrok |
| 🛡️ Security | 4 | HaveIBeenPwned, Bitwarden, Proton VPN, Temp Mail |
| 📄 PDF & Files | 5 | iLovePDF, SmallPDF, Convertio, VirusTotal |
| 🏋️ Health | 5 | HealthifyMe, WebMD, MedlinePlus, Yoga Journal |
| 🛒 Shopping | 4 | Amazon India, Flipkart, Meesho, PriceBaba |
| ✈️ Travel | 6 | MakeMyTrip, Goibibo, Booking.com, Skyscanner, Google Maps |

---

## ⌨️ SLASH COMMANDS (27 total)

\`\`\`
/nasa          → NASA space photo of the day
/wiki [topic]  → Wikipedia summary
/joke          → Random joke
/shayari       → Hindi/Urdu shayari
/map [jagah]   → Google Maps
/quote         → Inspirational quote
/qr [text]     → QR code generator
/meaning [word]→ Dictionary definition
/search [query]→ Web search
/img [prompt]  → Puter DALL-E 3 image
/image [prompt]→ Pollinations AI image
/canva [idea]  → Open Canva design
/design [type] → Canva templates
/chatgpt [q]   → Open in ChatGPT
/gemini [q]    → Open in Gemini
/wolfram [q]   → Wolfram Alpha
/desmos        → Graphing calculator
/github [q]    → GitHub search/new repo
/replit        → Browser IDE
/codepen       → CodePen playground
/youtube [q]   → YouTube search
/spotify [q]   → Spotify search
/pw            → Physics Wallah
/neet          → NTA NEET portal
/irctc         → IRCTC booking
/translate [text] → Google Translate
/weather [city]   → Weather info
\`\`\`

---

## 🔑 ALL API KEYS (.env.local template)

\`\`\`bash
# ═══ REQUIRED (koi ek toh chahiye) ═══════════════════════
GROQ_API_KEY=              # console.groq.com/keys — FREE 14,400/day
GEMINI_API_KEY=            # aistudio.google.com — FREE 1500/day
NEXT_PUBLIC_GEMINI_API_KEY=  # Same as above

# ═══ AI MODELS ═══════════════════════════════════════════
OPENROUTER_API_KEY=        # DeepSeek R1 Think mode — $0.55/1M
TOGETHER_API_KEY=          # 70B fallback — $25 free credit

# ═══ VOICE & AUDIO ═══════════════════════════════════════
OPENAI_API_KEY=            # Premium TTS
HUGGINGFACE_TOKEN=         # MusicGen — FREE hf_...
FREESOUND_API_KEY=         # Sound effects — FREE

# ═══ WEATHER & NEWS ══════════════════════════════════════
OPENWEATHER_API_KEY=       # FREE 60/min
NEWSDATA_API_KEY=          # India news — FREE 200/day pub_...
GUARDIAN_API_KEY=          # Quality news — FREE 500/day
WAQI_API_KEY=              # Air quality — FREE

# ═══ MEDIA & ENTERTAINMENT ═══════════════════════════════
TMDB_API_KEY=              # Movies/TV — FREE unlimited
OMDB_API_KEY=              # IMDB data — FREE 1000/day
GIPHY_API_KEY=             # GIFs — FREE 1000/day
NEXT_PUBLIC_YOUTUBE_API_KEY= # YouTube — FREE 100 units/day
LASTFM_API_KEY=            # Music charts — FREE
SPOTIFY_CLIENT_ID=         # Music search — FREE (no login)
SPOTIFY_CLIENT_SECRET=     # Pair with above

# ═══ PHOTOS ══════════════════════════════════════════════
UNSPLASH_ACCESS_KEY=       # Hi-res photos — FREE 50/hr
PEXELS_API_KEY=            # Photos+videos — FREE unlimited
PIXABAY_API_KEY=           # Photos+vectors — FREE
NASA_API_KEY=DEMO_KEY      # Space content (DEMO_KEY works)

# ═══ DEVELOPER TOOLS ═════════════════════════════════════
GITHUB_TOKEN=              # ghp_... — FREE 5000/hr

# ═══ PRODUCTIVITY ════════════════════════════════════════
NOTION_API_KEY=            # Pages search — FREE secret_...
TODOIST_API_TOKEN=         # Tasks — FREE
TRELLO_API_KEY=            # Boards — FREE
TRELLO_TOKEN=              # Pair with above
AIRTABLE_API_KEY=          # Tables — FREE pat_...

# ═══ CLOUD SYNC (optional) ════════════════════════════════
SUPABASE_URL=              # Cross-device sync — FREE
SUPABASE_ANON_KEY=         # Pair with above
FIREBASE_API_KEY=          # Realtime sync — FREE
FIREBASE_PROJECT_ID=       # Firebase project name
\`\`\`

---

## 📱 BOTTOM NAV (5 tabs)

\`\`\`
💬 Chat    → /          (main page)
📁 Media   → /media     (gallery)
🎨 Studio  → /studio    (AI generation)
🔗 Apps    → /apps      (150+ apps)
⚙️ Settings → /settings  (keys + profile)
\`\`\`

Extra pages (accessible via links):
- /briefing → Daily Briefing
- /canva → Canva AI
- /voice → Voice mode
- /tools → Tools explorer
- /system → System Dashboard (storage + credits + GitHub guide)

---

## 🌟 KEY FEATURES LIST

### Chat Features
- Hinglish AI (Jons Bhai personality)
- KaTeX math rendering (NEET/JEE formulas)
- Markdown with syntax highlighting
- 4 chat modes: Flash / Deep / Think / Voice
- Conversation memory (auto-extracted)
- Smart chat titles (auto-generated)
- Thumbs up/down feedback
- Message copy button
- Chat history (IndexedDB, offline)

### Tool Features
- 20-category intent detection (<1ms, zero API)
- 77 tools with fallback chains
- Cache (70-80% API calls saved)
- Real-time: weather, crypto, news, stocks
- India-specific: PNR, pincode, fuel prices, NEET info
- GitHub: trending, repo info, user stats
- Music: Deezer (30-sec preview!), Spotify, Last.fm
- Media: GIFs (Tenor), Photos (Unsplash), Anime (Jikan)
- Dev: npm, PyPI, StackOverflow, LeetCode stats

### Media / Studio
- DALL-E 3 (via Puter - FREE)
- Pollinations Flux/Turbo (no key)
- Stable Diffusion (web)
- MusicGen (HuggingFace)
- TTS: Puter → OpenAI → Browser fallback
- Puter storage (1GB FREE per user)
- AI auto-tagging
- Image compression (120×120 thumbnails)

### India Features
- NEET/JEE info (NTA portal links)
- IRCTC booking links + PNR status
- India fuel prices
- Government scheme lookup
- Rewa/Maihar specific info
- IPL cricket scores
- UPI payment apps
- India shopping (Flipkart, Meesho)

### System Features
- Smart routing (credit-aware, limit tracking)
- Offline mode (IndexedDB)
- Cross-device sync (Supabase optional)
- Daily usage stats
- GitHub → Vercel auto-deploy guide
- Debug endpoint: /api/tools-status

---

## ⏳ PENDING FEATURES (v20 ke liye)

### HIGH PRIORITY
1. **NEET MCQ Quiz Mode** — Puter AI generates MCQs → KaTeX formulas → spaced repetition
2. **India Hub** (/india page) — PNR real API, IFSC lookup, RTO check, Aadhaar verify
3. **Chat PDF Export** — jsPDF library → full conversation download
4. **Python Code Runner** — Pyodide.js (Python in browser, zero server)

### MEDIUM PRIORITY
5. **Periodic Table** — Interactive, NEET-focused, click for properties
6. **Formula Sheet Generator** — Physics/Chem/Math, topic-wise, export PDF
7. **Previous Year Papers** — NEET/JEE PYQ finder + AI explanations
8. **Voice TTS Auto-Speak** — Toggle to auto-read responses aloud
9. **Chat Export JSON** — Full IndexedDB download button

### LOW PRIORITY
10. **Memory Manual Boost** — User click +3 importance on memories
11. **Cloudinary Backup** — When Puter 1GB exceeded
12. **Tool Registry: 100+ tools** — Add 23 more to reach 100
13. **Client-side Intent Cache** — Re-detect same query se bacho
14. **Weekly Review Trigger** — Auto Sunday reminder

---

## 🔄 HOW TO RESUME (New Chat Instructions)

### Step 1: Context dena
> "JARVIS v19 project hai. [paste this document ka relevant section]"

### Step 2: Download latest ZIP
Latest: **JARVIS-v19-Connected.zip**
\`\`\`bash
# Extract karo
unzip JARVIS-v19-Connected.zip
cd jarvis-v19-connected

# Install + run
npm install
npm run dev    # localhost:3000
\`\`\`

### Step 3: Deploy to Vercel
\`\`\`bash
# Git init
git init
git remote add origin https://github.com/YOUR_USERNAME/jarvis-ai.git
echo ".env.local\\nnode_modules/\\n.next/" > .gitignore
git add .
git commit -m "feat: JARVIS v19"
git push -u origin main
# Vercel pe import karo → env vars add karo
\`\`\`

### Step 4: Minimum env vars
\`\`\`
GROQ_API_KEY=gsk_...     ← console.groq.com/keys
GEMINI_API_KEY=AIza...   ← aistudio.google.com/apikey
\`\`\`

---

## 🏗️ ARCHITECTURE DECISIONS (Important)

| Decision | Rationale |
|----------|-----------|
| Puter.js primary AI | FREE GPT-4o, DALL-E 3, TTS, 1GB storage — user ka apna account |
| Groq first in cascade | Fastest inference, free tier adequate for normal use |
| Intent detection no-API | <1ms vs 2-5s Gemini round-trip savings |
| Tool cache LRU | 70-80% redundant API calls eliminate |
| Puter storage for media | ZERO Vercel bandwidth = free forever |
| URL-only for images | Never proxy images through server |
| IndexedDB offline-first | Works without internet, instant load |
| SSE not WebSocket | Vercel compatible, simpler, works everywhere |
| nodejs runtime | Edge runtime breaks dynamic imports + cache singleton |

---

## 🐛 KNOWN ISSUES / GOTCHAS

1. **Puter.js requires login** — User must sign in to puter.com for AI/storage features
2. **Edge runtime disabled** — deep-stream uses nodejs runtime (edge breaks cache)
3. **YouTube API** — 100 units/day limit is very low; Invidious fallback active
4. **Together AI** — $25 credit expires; refill needed or stays on Groq/Gemini
5. **OMDB demo key** — 1000/day shared; add own key for reliable movie search
6. **Spotify** — Client Credentials flow only; no user playlists (OAuth not implemented)
7. **Supabase sync** — Optional; if not configured, stays local (this is fine)

---

## 📊 STATS SUMMARY

\`\`\`
Files:       159 source files
Pages:       10 routes + 7 API routes
Tools:       77 (17 no-key + 11 free-key + 49 connected)
Apps:        150+ apps, 20 categories, 558 actions
API Keys:    27 optional + 2 required
Slash Cmds:  27 commands
Storage:     6 layers (IndexedDB + Puter + localStorage + Cache + Supabase + Firebase)
AI Cascade:  5 providers Flash + 3 Think + 3 Image
Monthly Cost: $0 (Groq + Gemini free tiers = sufficient)
\`\`\`

---

*Document auto-generated. Last updated: JARVIS v19 Connected APIs session.*
*Next session ke liye: Is document ko copy karo aur Claude ko de do as context.*
`

fs.writeFileSync('JARVIS-MASTER-DOC.md', doc)
console.log('✅ JARVIS-MASTER-DOC.md generated!')
console.log(`Size: ${(doc.length/1024).toFixed(1)}KB`)
