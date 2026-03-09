# JARVIS — Master TODO
# Updated: March 2026 — v11

## ✅ ALL DONE (v9 → v11)

### v9-v10
- 7-provider storage cascade
- Streaming SSE word-by-word (Flash/Think/Auto)
- Multi-day chat history (200 messages)
- Real memory system (extractor + userProfile)
- Onboarding modal (naam poochho pehli baar)
- Proactive daily greeting
- [LEARN: key=value] — AI khud facts save karta hai
- Real reminders (Notification API + 30s check)
- Time-aware prompts (subah/shaam/raat)
- India page hata diya
- Social page rebuild (Telegram + WhatsApp only, AI captions)
- Studio image gallery (IndexedDB save/delete)
- Settings Memory tab (view/edit/delete facts)
- Follow-up chips after AI reply
- URL summarizer API (/api/fetch-url)
- Service Worker v3 (network-first + SW push notifications)
- userId dynamic from profile
- Share + Copy on every AI message
- [LEARN:] stripped from display
- Voice: language auto-detect + memory context

### v11 (this session)
- Deep mode → SSE streaming with LIVE tool progress (⏳ → ✅)
- URL auto-detect in InputBar → "Summarize karein?" chip
- Proactive follow-up (kal ki baat yaad dilao on app open)
- lastTopic saved after every conversation
- Settings: API key Test button (live verify)
- Voice: Continuous mode 🔄 (auto-listen after speak)
- Voice: Conversation history shown
- Retry button on failed messages
- PWA PNG icons (192x192 + 512x512 generated)
- manifest.json updated with PNG icons
- Math = direct answer (system prompt)
- Calculator verbose fix

## 🔴 REMAINING

### 1. Chat history search
- "Purani baat kaise dhundhen?" — koi search nahi
- Ctrl+F / magnifier icon → filter msgs by keyword

### 2. Chat export
- "Yeh conversation save karna hai" — koi option nahi
- Download as .txt → simple, no library needed

### 3. Notification — ask at better time
- Abhi 3 sec baad permission maangta hai — annoying
- Maango jab user pehla reminder set kare

### 4. Study page improvements
- Generic hai — quiz mode nahi
- "Quiz me on [topic]" button → 5 MCQ generate + score

## 🟢 FUTURE / LOWER PRIORITY

- Dark/Light mode toggle
- Message edit (user message typo fix)
- Weekly mood/progress summary display
- Semantic memory search
- PWA install prompt (custom, not browser default)

## 📝 ARCHITECTURE
- Deep mode = /api/jarvis/deep-stream (SSE, tools, live progress)
- Flash/Think/Auto = /api/jarvis/stream (SSE)
- Memory = localStorage jarvis_memory_v1 + jarvis_profile_v2
- Images = IndexedDB jarvis_studio > images
- Reminders = localStorage jarvis_reminders_v1 + SW push
- SW = Network-first, API never cached
- lastTopic = localStorage jarvis_last_topic {topic, date}

## 🎯 NEXT SESSION:
1. Chat search (keyword filter)
2. Chat export (.txt download)
3. Study page quiz mode
4. Notification permission at right time
