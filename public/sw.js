// JARVIS Service Worker v7 — Background Automation
// Background sync: pending messages sent when online
// Push notifications: proactive JARVIS alerts
// Cache strategy: aggressive for static, network-first for pages
// Zero Vercel bandwidth: Pollinations/Deezer/YouTube never hit Vercel

const CACHE_V    = 'jarvis-v7'
const STATIC     = 'jarvis-static-v7'
const IMG_CACHE  = 'jarvis-img-v7'
const FONT_CACHE = 'jarvis-font-v7'
const SDK_CACHE  = 'jarvis-sdk-v7'
const API_CACHE  = 'jarvis-api-v7'

const STATIC_ASSETS = ['/', '/manifest.json', '/offline.html']

// ── Install ───────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(STATIC).then(c => c.addAll(STATIC_ASSETS).catch(() => {}))
  )
  self.skipWaiting()
})

// ── Activate ──────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => ![CACHE_V, STATIC, IMG_CACHE, FONT_CACHE, SDK_CACHE, API_CACHE].includes(k))
            .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

// ── Fetch strategy ────────────────────────────────────
self.addEventListener('fetch', e => {
  const { request } = e
  const url = new URL(request.url)

  // Pollinations / external media — cache-first 24h (never hits Vercel)
  if (/pollinations\.ai|deezer\.com\/track|cdnjs\.cloudflare|fonts\.googleapis/.test(url.hostname)) {
    e.respondWith(cacheFirst(request, IMG_CACHE, 86400))
    return
  }

  // Puter.js SDK — cache 7 days
  if (url.hostname === 'js.puter.com') {
    e.respondWith(cacheFirst(request, SDK_CACHE, 604800))
    return
  }

  // Google Fonts CSS — cache 7 days
  if (url.hostname === 'fonts.gstatic.com') {
    e.respondWith(cacheFirst(request, FONT_CACHE, 604800))
    return
  }

  // External APIs — SHORT cache (weather 10min, crypto 2min, news 5min)
  if (url.hostname.includes('open-meteo.com')) {
    e.respondWith(cacheFirst(request, API_CACHE, 600))
    return
  }
  if (url.hostname.includes('coingecko.com')) {
    e.respondWith(cacheFirst(request, API_CACHE, 120))
    return
  }
  if (url.hostname.includes('hacker-news.firebaseio.com')) {
    e.respondWith(cacheFirst(request, API_CACHE, 300))
    return
  }

  // JARVIS API routes — network only (never cache AI responses)
  if (url.pathname.startsWith('/api/jarvis') || url.pathname.startsWith('/api/tts')) {
    e.respondWith(networkOnly(request))
    return
  }

  // Scheduler API — background, network only
  if (url.pathname.startsWith('/api/scheduler')) {
    e.respondWith(networkOnly(request))
    return
  }

  // Next.js static assets (_next/static) — cache forever
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(cacheFirst(request, STATIC, 31536000))
    return
  }

  // App pages — network first, cache fallback
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).then(res => {
        if (res.ok) {
          caches.open(STATIC).then(c => c.put(request, res.clone()))
        }
        return res
      }).catch(() =>
        caches.match(request).then(r => r || caches.match('/'))
      )
    )
    return
  }
})

// ── Background Sync ────────────────────────────────────
// When connectivity restores, run pending tasks
self.addEventListener('sync', e => {
  if (e.tag === 'jarvis-background-sync') {
    e.waitUntil(runBackgroundSync())
  }
  if (e.tag === 'jarvis-health-check') {
    e.waitUntil(triggerHealthCheck())
  }
})

async function runBackgroundSync() {
  try {
    // Trigger cache warmup on server
    await fetch('/api/scheduler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'cache_warmup' }),
    }).catch(() => {})

    // Notify client that sync happened
    const clients = await self.clients.matchAll()
    clients.forEach(c => c.postMessage({ type: 'SYNC_COMPLETE', ts: Date.now() }))
  } catch {}
}

async function triggerHealthCheck() {
  try {
    const res = await fetch('/api/scheduler?task=health_check&secret=jarvis-cron-2025')
    const data = await res.json()
    const clients = await self.clients.matchAll()
    clients.forEach(c => c.postMessage({ type: 'HEALTH_RESULT', data }))
  } catch {}
}

// ── Push Notifications ─────────────────────────────────
self.addEventListener('push', e => {
  if (!e.data) return
  const data = e.data.json().catch(() => ({ title: 'JARVIS', body: 'Kuch hua!' }))
  e.waitUntil(
    self.registration.showNotification(data.title || 'JARVIS 🤖', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'jarvis-proactive',
      renotify: true,
      data: { url: data.url || '/' },
      actions: [
        { action: 'open', title: 'JARVIS kholo' },
        { action: 'dismiss', title: 'Baad mein' },
      ]
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  if (e.action === 'dismiss') return
  const url = e.notification.data?.url || '/'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes(self.location.origin))
      if (existing) { existing.focus(); existing.navigate(url) }
      else self.clients.openWindow(url)
    })
  )
})

// ── Message from client ───────────────────────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting()
  if (e.data?.type === 'TRIGGER_SYNC') {
    self.registration.sync.register('jarvis-background-sync').catch(() => {})
  }
  if (e.data?.type === 'CACHE_BUST') {
    caches.delete(CACHE_V).then(() => caches.delete(STATIC))
  }
})

// ── Helpers ───────────────────────────────────────────
async function cacheFirst(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) {
    const fetchedAt = cached.headers.get('sw-fetched-at')
    if (fetchedAt && Date.now() - Number(fetchedAt) < maxAge * 1000) return cached
  }
  try {
    const fresh = await fetch(request)
    if (fresh.ok) {
      const headers = new Headers(fresh.headers)
      headers.set('sw-fetched-at', Date.now().toString())
      const toCache = new Response(await fresh.clone().arrayBuffer(), {
        status: fresh.status, headers
      })
      cache.put(request, toCache)
    }
    return fresh
  } catch {
    return cached || new Response('Offline', { status: 503 })
  }
}

async function networkOnly(request) {
  try { return await fetch(request) }
  catch { return new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } }) }
}

// ── Periodic background ping every 6 hours ────────────
self.addEventListener('periodicsync', e => {
  if (e.tag === 'jarvis-periodic') {
    e.waitUntil(runBackgroundSync())
  }
})
