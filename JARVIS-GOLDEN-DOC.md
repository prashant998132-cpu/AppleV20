# 🤖 JARVIS GOLDEN MASTER DOCUMENT
## Naye chat ke liye — POORA context ek file mein
## ⚠️ Har update ke baad yeh file bhi update karo

> **Version:** v20 (App Control + 16 Cards + NavDrawer)
> **Developer:** Prashant (Mayur) · Nadan, Maihar, MP · NEET student
> **Stack:** Next.js 14 + TypeScript + Puter.js + Vercel
> **Repo:** https://github.com/prashant998132-cpu/AppleV20
> **Live:** https://apple-v20.vercel.app
> **Cost:** ₹0/month

---

## 🏆 GOLDEN RULES — KABHI MAT TOODO

### RULE 1 — VERCEL LIMIT KABHI KHATAM NAHI HOGI (agar yeh follow karo)
```
SAHI: Image → Pollinations URL (unka server, tera 0 bytes)
SAHI: Music → Deezer CDN URL (unka server, tera 0 bytes)
SAHI: Video → YouTube embed (unka server, tera 0 bytes)
SAHI: Files → Puter 1GB cloud (user ka account)
SAHI: API   → Sirf JSON return karo (1-2KB max)

GALAT: Koi bhi file Vercel se serve karna

MATH: 100,000 executions/month ÷ 30 days = 3,333/day = ~200 conversations KABHI KHATAM NAHI
```

### RULE 2 — SMART ROUTER CASCADE
```
FLASH: Groq 8b(free 14400/day) → Groq 70b(free 1000) → Together AI → Gemini 2.0 Flash(free 1500) → Puter GPT-4o-mini
THINK: DeepSeek R1(OpenRouter $0.55/1M) → Gemini Thinking(free 50/day) → Puter GPT-4o
IMAGE: Puter DALL-E 3(free) → Pollinations Flux(free URL) → Pollinations Turbo(free URL)

SAVING TRICKS (already wired):
✓ Intent filter → chitchat sirf Groq (no Gemini wasted)
✓ TTL cache → 70-80% repeat queries free
✓ Max 2 tools → small prompts
✓ 8 msg history → small context
✓ Free tools first, paid last resort
```

### RULE 3 — JARVIS APP CONTROL (v20)
```
JARVIS poori app control karta hai chat se:

User: "Study kholo"       → router.push('/study')
User: "Settings kholo"    → router.push('/settings')
User: "India Hub kholo"   → router.push('/india')
User: "Apps kholo"        → router.push('/apps')
User: "Studio kholo"      → router.push('/studio')
User: "Voice kholo"       → router.push('/voice')
User: "Think mode karo"   → setMode('think')
User: "Flash mode karo"   → setMode('flash')
User: "Chat clear karo"   → setMsgs([])
User: "Menu kholo"        → setNavOpen(true)
User: "Search kholo"      → setSearchOpen(true)
User: "Reminder set karo" → addReminder(...)

HOW: deep-stream → appCommand string detect → SSE → execAppCommand() → router/setState
```

### RULE 4 — 16 INLINE CARD TYPES (ChatGPT style)
```
image    → "image banao"         → Pollinations URL (0 bandwidth)
music    → "song suno"           → Deezer 30-sec MP3 player (0 bandwidth)
movie    → "movie kaisi hai"     → OMDB poster + rating (0 bandwidth)
weather  → "mausam batao"        → JSON card (2KB)
github   → "github trending"     → JSON card (1KB)
news     → "news batao"          → Clickable headlines (2KB)
book     → "book recommend"      → OpenLib cover URL (0 bandwidth)
gif      → "gif bhejo"           → Tenor URL (0 bandwidth)
canva    → "poster/banner/logo"  → Canva redirect URL (0 bandwidth)
youtube  → "youtube video"       → YouTube iframe embed (0 bandwidth)
wolfram  → "solve/compute"       → Wolfram iframe (0 bandwidth)
desmos   → "graph/plot"          → Desmos iframe (0 bandwidth)
replit   → "run code"            → Replit redirect (0 bandwidth)
maps     → "map/rasta"           → Google Maps iframe (0 bandwidth)
spotify  → "playlist/gaana"      → Spotify+JioSaavn links (0 bandwidth)
figma    → "wireframe/ui design" → Figma redirect (0 bandwidth)
links    → fallback multi-links  → External URLs (0 bandwidth)
```

### RULE 5 — PERSONALITY: JONS BHAI
```
Tone: Hinglish, sarcastic, caring, Tony Stark AI
- 1-3 lines max (jab tak explain na manga)
- "As an AI" kabhi nahi bolna
- Math → seedha number (18% of 4500 = 810)
- KaTeX: $formula$ inline, $$formula$$ display
- [LEARN: type=data] → user facts yaad karo
- NEET/JEE aware
- App control aware ("main seedha le jaata hun")
```

### RULE 6 — NAVIGATION: J LOGO DRAWER
```
Bottom nav = HATA DIYA (BottomNav returns null — import safe hai)
"J" logo tap → NavDrawer slide-up
Drawer: Chat · Study · Studio · Apps · India Hub · Media · Voice · Settings
```

### RULE 7 — GOLDEN DOC UPDATE RULE ⚠️
```
JAB BHI KUCH NAYA KARO:
  Naya page     → file structure + pages table mein add karo
  Naya tool     → tools section mein update karo
  Naya card     → Rule 4 mein add karo
  Naya command  → Rule 3 mein add karo
  Settings change → relevant rule mein update karo
  Version change  → top pe version update karo
```

---

## 📁 FILE STRUCTURE

```
JARVIS-FINAL-V2/
├── app/
│   ├── page.tsx              ← MAIN CHAT (rich cards, app control, smart chips, export)
│   ├── layout.tsx            ← Puter.js + KaTeX CDN + PWA meta
│   ├── india/page.tsx        ← 🇮🇳 India Hub (IFSC/Pincode/PNR/Fuel/Holidays/IP/RTO)
│   ├── study/page.tsx        ← 📚 NEET Study (MCQ Quiz 24Q + Formula Sheet + Progress)
│   ├── apps/page.tsx         ← 🔗 Apps Hub (150+ apps, 20 categories)
│   ├── media/page.tsx        ← 📁 Media Gallery (Puter cloud)
│   ├── studio/page.tsx       ← 🎨 AI Studio (image/music/voice)
│   ├── settings/page.tsx     ← ⚙️ 27 API keys + Profile + Memory viewer
│   ├── briefing/page.tsx     ← 📰 Daily AI Briefing
│   ├── canva/page.tsx        ← 🎨 Canva AI templates
│   ├── voice/page.tsx        ← 🎤 Voice Mode (auto-speak)
│   ├── tools/page.tsx        ← 🔧 Tools Explorer
│   ├── system/page.tsx       ← 📊 System Dashboard
│   └── api/
│       ├── jarvis/stream/route.ts      ← Flash+Think SSE
│       ├── jarvis/deep-stream/route.ts ← Deep: tools+cards+appCommand
│       └── tools-status/route.ts       ← Debug: GET /api/tools-status?q=query
│
├── components/shared/
│   ├── NavDrawer.tsx   ← Slide-up nav (8 pages) — J logo triggers
│   ├── BottomNav.tsx   ← Returns null (kept for import compat)
│   └── Toast.tsx       ← Notification toast
│
├── lib/
│   ├── core/smartRouter.ts       ← 14 providers, credit tracking
│   ├── tools/intent.ts           ← <1ms intent, 20 categories
│   ├── tools/registry.ts         ← Tool metadata
│   ├── tools/connected/index.ts  ← 49 connected tools
│   ├── tools/no-key/index.ts     ← 17 no-key tools
│   ├── tools/free-key/index.ts   ← 11 free-key tools
│   ├── integrations/mega.ts      ← 150+ apps, 558 actions
│   ├── db/index.ts               ← Dexie.js IndexedDB
│   ├── personality/index.ts      ← Jons Bhai character
│   ├── memory/extractor.ts       ← [LEARN:] processor
│   └── chat/slashCommands.ts     ← 27 slash commands
│
├── JARVIS-GOLDEN-DOC.md    ← THIS FILE
├── JARVIS_TODO.md          ← TODO list
├── .env.example            ← All env vars
└── vercel.json             ← Deploy config
```

---

## 🔧 TOOLS (77 total)

```
No-key (17): weather, datetime, wikipedia, location, word_meaning, holidays,
             sunrise_sunset, pincode, translate, recipe, joke, ISS_location,
             books, image_fast, reddit, hackernews, calculate

Free-key (11): tmdb_search, giphy_search, pexels, unsplash, lastfm,
               spotify_search, notion_search, todoist, youtube_api,
               guardian_news, github_my_repos

Connected (49): github_trending, npm_search, deezer_search, omdb_search,
                tenor_gifs, anime_search, openlib, stackoverflow, leetcode_stats,
                chess_stats, country_info, ip_info, exchange_rate, synonyms,
                rhymes, urban_dictionary, pokemon, cocktail, trivia, advice,
                random_quote, qr_code, hash_text, color_info, uuid_gen...
```

---

## 📊 SYSTEM DASHBOARD (/system) — INTACT

```
AI Providers tab  → 14 providers, daily usage, cost, status
Storage tab       → 6 layers, Puter 1GB usage meter
Smart Route tab   → cascade order, credit saving strategies, 18 tool categories
GitHub tab        → deploy guide, repo link, version history
```

---

## 🔑 API KEYS

```
MINIMUM (app chalega):
  GROQ_API_KEY=gsk_...          # console.groq.com/keys (FREE)
  GEMINI_API_KEY=AIza...        # aistudio.google.com/apikey (FREE)
  NEXT_PUBLIC_GEMINI_API_KEY=   # Same as above

OPTIONAL (features enhance):
  OPENROUTER_API_KEY  → DeepSeek R1 think mode
  OPENWEATHER_API_KEY → Precise weather
  TMDB_API_KEY        → Movie posters
  NEWS_API_KEY        → News search
  SPOTIFY_CLIENT_ID/SECRET → Spotify
  YOUTUBE_DATA_API_KEY → YouTube search
  GITHUB_TOKEN        → GitHub repos
  SUPABASE_URL/KEY    → Cross-device sync
```

---

## 📱 PAGES STATUS

| Route | Page | Status |
|-------|------|--------|
| / | Main Chat | ✅ App control + 16 cards + smart chips |
| /india | India Hub | ✅ IFSC/PNR/Pincode/Fuel/Holidays |
| /study | NEET Study | ✅ MCQ Quiz + Formula Sheet |
| /apps | Apps Hub | ✅ 150+ apps |
| /studio | AI Studio | ✅ Image/Music/Voice |
| /media | Media Gallery | ✅ Puter cloud |
| /voice | Voice Mode | ✅ Auto-speak |
| /settings | Settings | ✅ 27 API keys |
| /system | Dashboard | ✅ Providers+Storage+Routing |
| /briefing | Daily Brief | ✅ AI morning summary |
| /canva | Canva | ✅ Templates |
| /tools | Tools | ✅ 77 tools explorer |

---

## ⏳ PENDING (v21)

```
HIGH:
□ Python runner in chat (Pyodide.js) — NEET calculations
□ Periodic Table (/periodic) — NEET Chemistry
□ NEET AI-generated MCQ (currently hardcoded 24)
□ Real PNR API (railwayapi.site)
□ Chat PDF export (jsPDF)

MEDIUM:
□ Voice TTS auto-speak toggle
□ Memory manual boost (+3 importance)
□ Weekly review auto (Sunday)
□ Wire smartRouter into stream route
□ NEET PYQ finder

LOW:
□ 100 tools target (need 23 more)
□ Social page cleanup
□ More Canva templates
```

---

## 🚀 RESUME COMMANDS

```bash
cd /home/claude/JARVIS-FINAL-V2

# Dev
npm run dev    # localhost:3000

# Build check
npm run build  # Must show: ✓ Compiled successfully

# Push
git add . && git commit -m "feat: ..." && git push origin main
# Vercel auto-deploys in 2-3 min

# Debug
curl localhost:3000/api/tools-status?q=weather+rewa
```

---

## 📈 STATS v20

```
Files: 164 · Pages: 12 · API Routes: 7
Tools: 77 (17+11+49) · Apps: 150+ (558 actions)
Inline Cards: 16 types · App Commands: 12
AI Providers: 14 · API Keys: 27 optional + 2 required
Monthly Cost: ₹0
Navigation: J logo → 8-page slide drawer
```

---
*"Jons Bhai zinda hai" 🤖 — Har naye chat mein yeh doc paste karo*
