// JARVIS Service Worker v28 — Stronger Offline Mode
const V = 'jarvis-v29'
const STATIC = [
  '/', '/briefing', '/anime', '/dashboard', '/studio', '/apps',
  '/media', '/learn', '/settings', '/tools', '/voice', '/termux', '/india',
  '/_next/static/chunks/main.js',
]

// ── Install: cache static assets ──────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(V).then(c => c.addAll(STATIC).catch(()=>{}))
    .then(() => self.skipWaiting())
  )
})

// ── Activate: clean old caches ─────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// ── Fetch Strategy ─────────────────────────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // Skip non-GET, extensions, devtools
  if (e.request.method !== 'GET') return
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') return

  // API calls — network first, no cache
  if (url.pathname.startsWith('/api/') ||
      url.hostname.includes('googleapis') ||
      url.hostname.includes('groq.com') ||
      url.hostname.includes('generativelanguage') ||
      url.hostname.includes('openrouter')) {
    e.respondWith(fetch(e.request).catch(() =>
      new Response(JSON.stringify({ error: 'Offline', offline: true }), {
        headers: { 'Content-Type': 'application/json' }
      })
    ))
    return
  }

  // Images — cache first (Pollinations, CDN)
  if (url.hostname.includes('pollinations') ||
      url.hostname.includes('image.tmdb') ||
      url.hostname.includes('cdn.myanimelist')) {
    e.respondWith(
      caches.open(V + '-img').then(c =>
        c.match(e.request).then(cached => {
          if (cached) return cached
          return fetch(e.request).then(r => {
            if (r.ok) c.put(e.request, r.clone())
            return r
          }).catch(() => cached || new Response('', { status: 503 }))
        })
      )
    )
    return
  }

  // Navigation & static — stale-while-revalidate
  e.respondWith(
    caches.open(V).then(c =>
      c.match(e.request).then(cached => {
        const fetched = fetch(e.request).then(r => {
          if (r.ok && e.request.method === 'GET') c.put(e.request, r.clone())
          return r
        }).catch(() => null)
        return cached || fetched || new Response('Offline', { status: 503 })
      })
    )
  )
})

// ── Background Sync ────────────────────────────────────────
self.addEventListener('sync', e => {
  if (e.tag === 'jarvis-sync') {
    e.waitUntil(
      self.clients.matchAll().then(clients =>
        clients.forEach(c => c.postMessage({ type: 'SYNC', tag: e.tag }))
      )
    )
  }
})

// ── Push Notifications ─────────────────────────────────────
self.addEventListener('push', e => {
  const data = e.data?.json() || { title: 'JARVIS', body: 'New notification' }
  e.waitUntil(
    self.registration.showNotification(data.title || 'JARVIS', {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'jarvis',
      data: data.url,
      vibrate: [200, 100, 200],
      actions: data.actions || [],
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data || '/'
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      const c = clients.find(c => c.url.includes(self.location.origin))
      if (c) { c.focus(); c.navigate(url) }
      else self.clients.openWindow(url)
    })
  )
})

// ── Periodic Background Sync ───────────────────────────────
self.addEventListener('periodicsync', e => {
  if (e.tag === 'jarvis-daily') {
    e.waitUntil(
      self.clients.matchAll().then(clients =>
        clients.forEach(c => c.postMessage({ type: 'DAILY_SYNC' }))
      )
    )
  }
})

console.log('[SW v28] JARVIS Service Worker loaded')
