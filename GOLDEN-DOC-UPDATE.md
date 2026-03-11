## Session End Update — v25 additions for JARVIS-GOLDEN-DOC.md

### New Pages (add to repo structure)
- app/android/page.tsx — Android setup guide (TWA + MacroDroid)
- app/learn/page.tsx — AI Course Creator (Gemini → Puter fallback)
- app/connected/page.tsx — API key management (18 integrations)
- app/anime/page.tsx — Anime Hub (Jikan API, watchlist)
- study/page.tsx — Rewritten: generic goal tracker (NEET removed)

### New Lib Files
- lib/android/bridge.ts — MacroDroid HTTP + Android Intent URL bridge. 30+ apps, WiFi/BT/Brightness/Volume/Alarm/Torch. parseAndroidCommand() detects Hinglish. executeAndroidCommand() runs it. No API cost.
- lib/proactive/engine.ts — v2: cross-session learning. LearnedProfile type. trackHabit() learns topics/subjects/langs/interests. Streak tracking. Morning nudge. Study suggestions from past topics. actionLabel on ProactiveEvent.

### New API Routes
- app/api/scheduler/route.ts — Vercel Cron handler. Tasks: health_check, cache_warmup, daily_summary, ping. GET?multi=1 runs all. POST from SW.

### Infrastructure Changes
- vercel.json — 2 cron jobs: daily 4AM IST (multi tasks) + every 6h (cache_warmup)
- public/sw.js — v7: background sync, push notifications, periodic sync, API cache (weather 10min, crypto 2min, news 5min), cache-first for Puter/Pollinations/Fonts
- app/layout.tsx — SW registration enhanced: background sync + periodic sync + SW→page messages
- twa/twa-manifest.json — Bubblewrap TWA config (package: com.jarvis.jons_bhai)
- twa/generate-keystore.sh — Keystore gen script (Termux/PC)
- public/.well-known/assetlinks.json — TWA domain verification (SHA256 TBD)
- .github/workflows/build-apk.yml — GitHub Actions APK builder (needs `workflow` scope on token)

### NavDrawer v25 — All 14 pages categorized
MAIN: Chat, Briefing
LEARN: Learn, Study  
EXPLORE: Anime, Studio, Canva, India Hub
TOOLS: Apps, Calculators, Media, Voice, System
SYSTEM: Android, APIs (Connected), Settings

### Dead Code Removed
- BottomNav import+render removed from: india, studio, voice, tools, apps pages
- NEET/JEE removed from: system prompt, study page, settings placeholder, layout comment, intent patterns (kept in intent.ts for backward compat)

### Android Chat Commands (live in send())
- "Open YouTube" → openApp() → Intent URL fallback
- "WiFi off karo" → MacroDroid localhost:1234 → no response = graceful fail
- "Alarm 7 baje laga" → setAlarm() → Android alarm intent fallback
- Detected BEFORE AI call — instant, zero API cost

### Golden Rules Reminder
1. BottomNav = dead stub — never render it
2. All colors = CSS vars only (var(--bg), var(--accent), etc.)
3. TypeScript: IntentResult uses categories[] not .cat
4. addReminder returns Reminder not Promise<Reminder>
5. use effectiveMode not mode in send()
6. git config user.email="jarvis@build.ai" user.name="JARVIS Builder" before every commit
7. Never serve files from Vercel — JSON + external URLs only
8. Context window: update golden doc at session end only
