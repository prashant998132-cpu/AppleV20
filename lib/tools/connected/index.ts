// lib/tools/connected/index.ts
// Real API Connections — 40+ services
// No-key (always work) + Free-key (unlock extra features)
// Every function has fallback. Nothing breaks.

const T = (ms = 8000) => AbortSignal.timeout(ms)

// ═══════════════════════════════════════════════════════════
// NO-KEY APIs — Always work, zero setup
// ═══════════════════════════════════════════════════════════

// ── 1. GitHub Trending (no key) ───────────────────────────
export async function github_trending(args: { lang?: string; since?: 'daily'|'weekly'|'monthly' }) {
  const lang = args.lang || ''
  const since = args.since || 'daily'
  try {
    // GitHub doesn't have official trending API — use ghapi.huchen.dev (free mirror)
    const url = `https://ghapi.huchen.dev/repositories?language=${encodeURIComponent(lang)}&since=${since}`
    const res = await fetch(url, { signal: T(7000) })
    if (!res.ok) throw new Error('ghapi failed')
    const data: any[] = await res.json()
    return data.slice(0, 8).map(r => ({
      name: r.name,
      author: r.author,
      description: r.description,
      stars: r.stars,
      forks: r.forks,
      language: r.language,
      url: r.url,
      stars_today: r.currentPeriodStars,
    }))
  } catch {
    // Fallback: GitHub search API (unauthenticated = 60 req/hr)
    const q = lang ? `language:${lang}` : 'stars:>1000'
    const res2 = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=6`, { signal: T() })
    if (!res2.ok) return { note: 'Trending unavailable', link: 'https://github.com/trending' }
    const d2 = await res2.json()
    return d2.items?.map((r: any) => ({
      name: r.name, author: r.owner?.login, description: r.description,
      stars: r.stargazers_count, language: r.language, url: r.html_url,
    }))
  }
}

// ── 2. GitHub Repo Info (no key — 60 req/hr) ──────────────
export async function github_repo(args: { repo: string }) {
  // repo = "owner/reponame"
  try {
    const [r, commits] = await Promise.allSettled([
      fetch(`https://api.github.com/repos/${args.repo}`, { signal: T() }),
      fetch(`https://api.github.com/repos/${args.repo}/commits?per_page=5`, { signal: T() }),
    ])
    const repo = r.status === 'fulfilled' && r.value.ok ? await r.value.json() : null
    if (!repo) return { error: 'Repo not found', repo: args.repo }
    const latestCommits = commits.status === 'fulfilled' && (commits.value as Response).ok
      ? (await (commits.value as Response).json()).map((c: any) => ({
          sha: c.sha?.slice(0, 7), message: c.commit?.message?.split('\n')[0], author: c.commit?.author?.name, date: c.commit?.author?.date,
        }))
      : []
    return {
      name: repo.full_name, description: repo.description, stars: repo.stargazers_count,
      forks: repo.forks_count, issues: repo.open_issues_count, language: repo.language,
      license: repo.license?.name, topics: repo.topics, url: repo.html_url,
      homepage: repo.homepage, created: repo.created_at, updated: repo.updated_at,
      default_branch: repo.default_branch, latest_commits: latestCommits,
    }
  } catch { return { error: 'GitHub API error', repo: args.repo } }
}

// ── 3. GitHub User Info (no key) ──────────────────────────
export async function github_user(args: { username: string }) {
  try {
    const [u, repos] = await Promise.allSettled([
      fetch(`https://api.github.com/users/${args.username}`, { signal: T() }),
      fetch(`https://api.github.com/users/${args.username}/repos?sort=stars&per_page=5`, { signal: T() }),
    ])
    const user = u.status === 'fulfilled' && u.value.ok ? await u.value.json() : null
    if (!user) return { error: 'User not found' }
    const topRepos = repos.status === 'fulfilled' && (repos.value as Response).ok
      ? (await (repos.value as Response).json()).map((r: any) => ({ name: r.name, stars: r.stargazers_count, language: r.language, url: r.html_url }))
      : []
    return {
      username: user.login, name: user.name, bio: user.bio, company: user.company,
      location: user.location, followers: user.followers, following: user.following,
      public_repos: user.public_repos, avatar: user.avatar_url, url: user.html_url,
      blog: user.blog, top_repos: topRepos,
    }
  } catch { return { error: 'GitHub API error' } }
}

// ── 4. GitHub Code Search (no key — limited) ──────────────
export async function github_search_code(args: { query: string; language?: string }) {
  try {
    const q = `${args.query}${args.language ? ` language:${args.language}` : ''}`
    const res = await fetch(`https://api.github.com/search/code?q=${encodeURIComponent(q)}&per_page=5`, { signal: T() })
    if (!res.ok) return { note: 'Code search needs auth', link: `https://github.com/search?q=${encodeURIComponent(q)}&type=code` }
    const d = await res.json()
    return d.items?.map((i: any) => ({
      name: i.name, path: i.path, repo: i.repository?.full_name,
      url: i.html_url, git_url: i.git_url,
    }))
  } catch { return { note: 'Use web search', link: `https://github.com/search?q=${encodeURIComponent(args.query)}&type=code` } }
}

// ── 5. npm Package Info (no key) ──────────────────────────
export async function npm_search(args: { query: string; size?: number }) {
  try {
    const res = await fetch(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(args.query)}&size=${args.size || 5}`, { signal: T() })
    if (!res.ok) throw new Error('npm failed')
    const d = await res.json()
    return d.objects?.map((o: any) => ({
      name: o.package.name, version: o.package.version, description: o.package.description,
      author: o.package.author?.name, keywords: o.package.keywords?.slice(0, 5),
      url: o.package.links?.npm, homepage: o.package.links?.homepage,
      downloads_weekly: o.downloads?.weekly,
    }))
  } catch { return { note: 'npm search failed', link: `https://www.npmjs.com/search?q=${encodeURIComponent(args.query)}` } }
}

export async function npm_package_info(args: { package: string }) {
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(args.package)}`, { signal: T() })
    if (!res.ok) return { error: 'Package not found' }
    const d = await res.json()
    const latest = d['dist-tags']?.latest
    const v = d.versions?.[latest]
    return {
      name: d.name, version: latest, description: d.description,
      license: v?.license || d.license, author: d.author?.name || d.author,
      homepage: d.homepage, keywords: d.keywords?.slice(0, 8),
      dependencies: v ? Object.keys(v.dependencies || {}).length : 0,
      weekly_downloads: null,  // needs separate call
      url: `https://www.npmjs.com/package/${d.name}`,
    }
  } catch { return { error: 'npm API error' } }
}

// ── 6. PyPI Package Info (no key) ─────────────────────────
export async function pypi_search(args: { query: string }) {
  // PyPI has no official search API — use warehouse search endpoint
  try {
    const res = await fetch(`https://pypi.org/pypi/${encodeURIComponent(args.query)}/json`, { signal: T() })
    if (res.ok) {
      const d = await res.json()
      const info = d.info
      return {
        name: info.name, version: info.version, summary: info.summary,
        author: info.author, license: info.license, home_page: info.home_page,
        requires_python: info.requires_python,
        classifiers: info.classifiers?.slice(0, 3),
        url: `https://pypi.org/project/${info.name}/`,
      }
    }
    // Try lowercase
    const res2 = await fetch(`https://pypi.org/pypi/${args.query.toLowerCase()}/json`, { signal: T() })
    if (!res2.ok) return { note: 'Package not found on PyPI', link: `https://pypi.org/search/?q=${encodeURIComponent(args.query)}` }
    const d2 = await res2.json()
    return { name: d2.info.name, version: d2.info.version, summary: d2.info.summary, url: `https://pypi.org/project/${d2.info.name}/` }
  } catch { return { note: 'PyPI search failed', link: `https://pypi.org/search/?q=${encodeURIComponent(args.query)}` } }
}

// ── 7. Deezer Music Search (no key — public API) ──────────
export async function deezer_search(args: { query: string; type?: 'track'|'artist'|'album'|'playlist' }) {
  const type = args.type || 'track'
  try {
    const res = await fetch(`https://api.deezer.com/search/${type}?q=${encodeURIComponent(args.query)}&limit=6&output=json`, { signal: T() })
    if (!res.ok) throw new Error('Deezer failed')
    const d = await res.json()
    if (type === 'track') {
      return d.data?.map((t: any) => ({
        title: t.title, artist: t.artist?.name, album: t.album?.title,
        duration: `${Math.floor(t.duration/60)}:${String(t.duration%60).padStart(2,'0')}`,
        preview_url: t.preview,  // 30-sec preview MP3, free!
        album_cover: t.album?.cover_medium,
        link: t.link,
      }))
    }
    if (type === 'artist') {
      return d.data?.map((a: any) => ({
        name: a.name, fans: a.nb_fan, picture: a.picture_medium, tracklist: a.tracklist, link: a.link,
      }))
    }
    return d.data?.slice(0, 6)
  } catch { return { note: 'Deezer unavailable', link: `https://www.deezer.com/search/${encodeURIComponent(args.query)}` } }
}

export async function deezer_chart(args: { country?: string }) {
  try {
    const res = await fetch('https://api.deezer.com/chart/0/tracks?limit=10&output=json', { signal: T() })
    if (!res.ok) throw new Error()
    const d = await res.json()
    return d.data?.map((t: any) => ({
      rank: t.position, title: t.title, artist: t.artist?.name,
      preview_url: t.preview, cover: t.album?.cover_small, link: t.link,
    }))
  } catch { return { note: 'Charts unavailable', link: 'https://www.deezer.com/en/channels/charts' } }
}

// ── 8. MusicBrainz (no key — free open music DB) ─────────
export async function musicbrainz_artist(args: { query: string }) {
  try {
    const res = await fetch(
      `https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(args.query)}&limit=3&fmt=json`,
      { headers: { 'User-Agent': 'JARVIS-AI/1.0 (contact@jarvis.ai)' }, signal: T() }
    )
    if (!res.ok) throw new Error()
    const d = await res.json()
    return d.artists?.slice(0, 3).map((a: any) => ({
      name: a.name, type: a.type, country: a.country,
      begin: a['life-span']?.begin, end: a['life-span']?.end,
      genres: a.genres?.map((g: any) => g.name),
      disambiguation: a.disambiguation,
      id: a.id,
      url: `https://musicbrainz.org/artist/${a.id}`,
    }))
  } catch { return { note: 'MusicBrainz unavailable' } }
}

// ── 9. Open Library Books (no key) ────────────────────────
export async function openlib_search(args: { query: string; author?: string; limit?: number }) {
  try {
    const q = args.author ? `author:${args.author}` : args.query
    const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=${args.limit || 5}&fields=key,title,author_name,first_publish_year,number_of_pages_median,ratings_average,cover_i,subject`, { signal: T() })
    if (!res.ok) throw new Error()
    const d = await res.json()
    return {
      total: d.numFound,
      books: d.docs?.map((b: any) => ({
        title: b.title, authors: b.author_name?.slice(0, 2), year: b.first_publish_year,
        pages: b.number_of_pages_median, rating: b.ratings_average?.toFixed(1),
        cover: b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : null,
        url: `https://openlibrary.org${b.key}`,
        subjects: b.subject?.slice(0, 3),
      }))
    }
  } catch { return { note: 'OpenLibrary unavailable', link: `https://openlibrary.org/search?q=${encodeURIComponent(args.query)}` } }
}

// ── 10. FreeSound Sound Effects (no key — public browse) ──
export async function freesound_browse(args: { query: string }) {
  // Public endpoint without key returns limited results
  try {
    const res = await fetch(
      `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(args.query)}&fields=name,url,previews,duration,description&page_size=5&format=json`,
      { signal: T() }
    )
    if (res.status === 401) {
      // No key — return search link
      return { note: 'FreeSound needs API key for audio, but browse is free', link: `https://freesound.org/search/?q=${encodeURIComponent(args.query)}` }
    }
    const d = await res.json()
    return d.results?.map((s: any) => ({
      name: s.name, duration: s.duration, description: s.description?.slice(0, 100),
      preview: s.previews?.['preview-hq-mp3'], url: s.url,
    }))
  } catch { return { note: 'FreeSound unavailable', link: `https://freesound.org/search/?q=${encodeURIComponent(args.query)}` } }
}

// ── 11. Wikipedia Image Search (no key) ───────────────────
export async function wikipedia_image(args: { query: string }) {
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(args.query)}`, { signal: T() })
    if (!res.ok) throw new Error()
    const d = await res.json()
    return {
      title: d.title, extract: d.extract?.slice(0, 200),
      image: d.originalimage?.source || d.thumbnail?.source,
      image_thumb: d.thumbnail?.source, url: d.content_urls?.desktop?.page,
    }
  } catch { return { note: 'Not found on Wikipedia' } }
}

// ── 12. StackOverflow Search (no key) ─────────────────────
export async function stackoverflow_search(args: { query: string; limit?: number }) {
  try {
    const res = await fetch(
      `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(args.query)}&site=stackoverflow&pagesize=${args.limit || 5}&filter=withbody`,
      { signal: T() }
    )
    if (!res.ok) throw new Error()
    const d = await res.json()
    return d.items?.map((q: any) => ({
      title: q.title, score: q.score, answer_count: q.answer_count,
      is_answered: q.is_answered, view_count: q.view_count,
      tags: q.tags?.slice(0, 4), link: q.link,
    }))
  } catch { return { note: 'StackOverflow unavailable', link: `https://stackoverflow.com/search?q=${encodeURIComponent(args.query)}` } }
}

// ── 13. Tenor GIF Search (no key — public) ────────────────
export async function tenor_gifs(args: { query: string; limit?: number }) {
  try {
    // Tenor has a public anonymous key
    const res = await fetch(
      `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(args.query)}&key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&limit=${args.limit || 5}&media_filter=gif`,
      { signal: T() }
    )
    if (!res.ok) throw new Error()
    const d = await res.json()
    return d.results?.map((g: any) => ({
      title: g.title || args.query, url: g.media_formats?.gif?.url,
      thumb: g.media_formats?.tinygif?.url || g.media_formats?.gif?.url,
      embed_url: `https://tenor.com/view/${g.id}`,
    }))
  } catch { return { note: 'Tenor unavailable', link: `https://tenor.com/search/${encodeURIComponent(args.query)}-gifs` } }
}

// ── 14. OMDB Movies (no key = 1000/day) ───────────────────
export async function omdb_search(args: { query: string; year?: number; type?: 'movie'|'series'|'episode' }) {
  const key = process.env.OMDB_API_KEY || 'trilogy'  // public demo key
  try {
    const params = new URLSearchParams({ s: args.query, apikey: key })
    if (args.year) params.set('y', String(args.year))
    if (args.type) params.set('type', args.type)
    const res = await fetch(`https://www.omdbapi.com/?${params}`, { signal: T() })
    if (!res.ok) throw new Error()
    const d = await res.json()
    if (d.Response === 'False') return { error: d.Error, query: args.query }
    return d.Search?.map((m: any) => ({
      title: m.Title, year: m.Year, type: m.Type,
      imdb_id: m.imdbID, poster: m.Poster !== 'N/A' ? m.Poster : null,
      imdb_url: `https://www.imdb.com/title/${m.imdbID}`,
    }))
  } catch { return { note: 'OMDB unavailable', link: `https://www.imdb.com/find?q=${encodeURIComponent(args.query)}` } }
}

export async function omdb_detail(args: { title?: string; imdb_id?: string }) {
  const key = process.env.OMDB_API_KEY || 'trilogy'
  try {
    const params = new URLSearchParams({ apikey: key, plot: 'short' })
    if (args.imdb_id) params.set('i', args.imdb_id)
    else if (args.title) params.set('t', args.title)
    const res = await fetch(`https://www.omdbapi.com/?${params}`, { signal: T() })
    if (!res.ok) throw new Error()
    const d = await res.json()
    if (d.Response === 'False') return { error: d.Error }
    return {
      title: d.Title, year: d.Year, rated: d.Rated, genre: d.Genre,
      director: d.Director, actors: d.Actors, plot: d.Plot,
      imdb_rating: d.imdbRating, imdb_votes: d.imdbVotes,
      poster: d.Poster !== 'N/A' ? d.Poster : null,
      runtime: d.Runtime, language: d.Language, country: d.Country,
      awards: d.Awards, box_office: d.BoxOffice,
      imdb_url: `https://www.imdb.com/title/${d.imdbID}`,
    }
  } catch { return { note: 'OMDB unavailable' } }
}

// ── 15. JikanAPI Anime (no key — MyAnimeList data) ────────
export async function anime_search(args: { query: string; limit?: number }) {
  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(args.query)}&limit=${args.limit || 5}&sfw=true`, { signal: T(10000) })
    if (!res.ok) throw new Error()
    const d = await res.json()
    return d.data?.map((a: any) => ({
      title: a.title, title_english: a.title_english,
      score: a.score, rank: a.rank, type: a.type,
      episodes: a.episodes, status: a.status,
      synopsis: a.synopsis?.slice(0, 200),
      image: a.images?.jpg?.image_url,
      url: a.url, genres: a.genres?.map((g: any) => g.name),
    }))
  } catch { return { note: 'Anime search unavailable' } }
}

// ── 16. Unsplash Photos (no key — limited public) ─────────
export async function unsplash_random(args: { query?: string; count?: number }) {
  // Without key, use source.unsplash.com
  const count = Math.min(args.count || 3, 5)
  const q = args.query || 'nature'
  return Array.from({ length: count }, (_, i) => ({
    url: `https://source.unsplash.com/1200x800/?${encodeURIComponent(q)}&sig=${i+Date.now()}`,
    thumb: `https://source.unsplash.com/400x300/?${encodeURIComponent(q)}&sig=${i+Date.now()}`,
    query: q, source: 'Unsplash (free)',
    link: `https://unsplash.com/s/photos/${encodeURIComponent(q)}`,
  }))
}

// ── 17. Lorem Picsum (no key — placeholder images) ────────
export async function picsum_image(args: { width?: number; height?: number; blur?: number; id?: number }) {
  const w = args.width || 800, h = args.height || 600
  const id = args.id
  const blur = args.blur ? `?blur=${args.blur}` : ''
  const url = id ? `https://picsum.photos/id/${id}/${w}/${h}${blur}` : `https://picsum.photos/${w}/${h}${blur}`
  return { url, width: w, height: h, source: 'Lorem Picsum (free placeholder)' }
}

// ── 18. RandomUser API (no key — test data) ───────────────
export async function random_user(args: { count?: number; nat?: string }) {
  try {
    const res = await fetch(`https://randomuser.me/api/?results=${args.count || 3}${args.nat ? `&nat=${args.nat}` : ''}`, { signal: T() })
    if (!res.ok) throw new Error()
    const d = await res.json()
    return d.results?.map((u: any) => ({
      name: `${u.name.first} ${u.name.last}`, email: u.email,
      gender: u.gender, phone: u.phone, nationality: u.nat,
      picture: u.picture?.medium, location: `${u.location?.city}, ${u.location?.country}`,
    }))
  } catch { return { note: 'RandomUser unavailable' } }
}

// ── 19. Gutenberg Free Books (no key) ─────────────────────
export async function gutenberg_search(args: { query: string; limit?: number }) {
  try {
    const res = await fetch(`https://gutendex.com/books?search=${encodeURIComponent(args.query)}&languages=en&mime_type=text/plain`, { signal: T() })
    if (!res.ok) throw new Error()
    const d = await res.json()
    return d.results?.slice(0, args.limit || 5).map((b: any) => ({
      title: b.title, authors: b.authors?.map((a: any) => a.name),
      subjects: b.subjects?.slice(0, 3), download_count: b.download_count,
      read_url: b.formats?.['text/html'] || b.formats?.['text/plain; charset=utf-8'],
      epub_url: b.formats?.['application/epub+zip'],
      gutenberg_url: `https://www.gutenberg.org/ebooks/${b.id}`,
    }))
  } catch { return { note: 'Gutenberg unavailable', link: `https://www.gutenberg.org/ebooks/search/?query=${encodeURIComponent(args.query)}` } }
}

// ── 20. Public APIs List (no key) ─────────────────────────
export async function list_public_apis(args: { category?: string; search?: string }) {
  try {
    const params = new URLSearchParams()
    if (args.category) params.set('category', args.category)
    if (args.search) params.set('title', args.search)
    const res = await fetch(`https://api.publicapis.org/entries?${params}`, { signal: T() })
    if (!res.ok) throw new Error()
    const d = await res.json()
    return {
      count: d.count,
      apis: d.entries?.slice(0, 10).map((a: any) => ({
        name: a.API, description: a.Description, auth: a.Auth,
        https: a.HTTPS, cors: a.Cors, category: a.Category, link: a.Link,
      }))
    }
  } catch { return { note: 'Public APIs list unavailable' } }
}

// ── 21. WordsAPI / Dictionary (no key fallback) ───────────
export async function get_synonyms(args: { word: string }) {
  try {
    const res = await fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(args.word)}&max=10`, { signal: T() })
    if (!res.ok) throw new Error()
    const d = await res.json()
    return { word: args.word, synonyms: d.map((w: any) => w.word) }
  } catch { return { word: args.word, synonyms: [], note: 'Unavailable' } }
}

export async function get_rhymes(args: { word: string }) {
  try {
    const res = await fetch(`https://api.datamuse.com/words?rel_rhy=${encodeURIComponent(args.word)}&max=10`, { signal: T() })
    if (!res.ok) throw new Error()
    const d = await res.json()
    return { word: args.word, rhymes: d.map((w: any) => w.word) }
  } catch { return { word: args.word, rhymes: [], note: 'Unavailable' } }
}

// ── 22. IP Geolocation (no key) ───────────────────────────
export async function ip_info(args: { ip?: string }) {
  try {
    const endpoint = args.ip ? `https://ipapi.co/${args.ip}/json/` : 'https://ipapi.co/json/'
    const res = await fetch(endpoint, { signal: T() })
    if (!res.ok) throw new Error()
    const d = await res.json()
    return {
      ip: d.ip, city: d.city, region: d.region, country: d.country_name,
      country_code: d.country_code, timezone: d.timezone, org: d.org,
      latitude: d.latitude, longitude: d.longitude,
    }
  } catch { return { note: 'IP lookup unavailable' } }
}

// ── 23. ExchangeRate (no key fallback) ────────────────────
export async function exchange_rate_free(args: { from: string; to: string; amount?: number }) {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${args.from.toUpperCase()}`, { signal: T() })
    if (!res.ok) throw new Error()
    const d = await res.json()
    const rate = d.rates?.[args.to.toUpperCase()]
    if (!rate) return { error: `Currency ${args.to} not found` }
    const amount = args.amount || 1
    return {
      from: args.from.toUpperCase(), to: args.to.toUpperCase(),
      rate, amount, converted: (amount * rate).toFixed(2),
      last_updated: d.time_last_update_utc,
    }
  } catch { return { note: 'Exchange rate unavailable' } }
}

// ── 24. Country Info (no key) ─────────────────────────────
export async function country_info(args: { country: string }) {
  try {
    const res = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(args.country)}?fields=name,capital,population,area,currencies,languages,flags,region,subregion,timezones,borders`, { signal: T() })
    if (!res.ok) throw new Error()
    const [c] = await res.json()
    return {
      name: c.name?.common, official: c.name?.official,
      capital: c.capital?.[0], region: c.region, subregion: c.subregion,
      population: c.population?.toLocaleString(), area: `${c.area?.toLocaleString()} km²`,
      currencies: Object.values(c.currencies || {}).map((cu: any) => `${cu.name} (${cu.symbol})`),
      languages: Object.values(c.languages || {}),
      timezones: c.timezones?.slice(0, 3),
      flag: c.flags?.png,
    }
  } catch { return { note: 'Country info unavailable' } }
}

// ── 25. Codeforces (no key) ───────────────────────────────
export async function codeforces_user(args: { handle: string }) {
  try {
    const res = await fetch(`https://codeforces.com/api/user.info?handles=${args.handle}`, { signal: T() })
    if (!res.ok) throw new Error()
    const d = await res.json()
    const u = d.result?.[0]
    if (!u) return { error: 'User not found' }
    return {
      handle: u.handle, rank: u.rank, max_rank: u.maxRank,
      rating: u.rating, max_rating: u.maxRating,
      contribution: u.contribution, friend_count: u.friendOfCount,
      avatar: u.avatar, url: `https://codeforces.com/profile/${u.handle}`,
    }
  } catch { return { note: 'Codeforces unavailable' } }
}

// ── 26. LeetCode Stats (no key) ───────────────────────────
export async function leetcode_stats(args: { username: string }) {
  try {
    const res = await fetch(`https://leetcode-stats-api.herokuapp.com/${args.username}`, { signal: T() })
    if (!res.ok) throw new Error()
    const d = await res.json()
    return {
      username: args.username, ranking: d.ranking,
      total_solved: d.totalSolved, total_questions: d.totalQuestions,
      easy: `${d.easySolved}/${d.totalEasy}`, medium: `${d.mediumSolved}/${d.totalMedium}`,
      hard: `${d.hardSolved}/${d.totalHard}`,
      acceptance_rate: d.acceptanceRate, url: `https://leetcode.com/${args.username}`,
    }
  } catch { return { note: 'LeetCode stats unavailable' } }
}

// ── 27. Chess.com Stats (no key) ──────────────────────────
export async function chess_stats(args: { username: string }) {
  try {
    const res = await fetch(`https://api.chess.com/pub/player/${args.username.toLowerCase()}/stats`, { signal: T() })
    if (!res.ok) throw new Error()
    const d = await res.json()
    return {
      username: args.username,
      bullet: { rating: d.chess_bullet?.last?.rating, wins: d.chess_bullet?.record?.win, losses: d.chess_bullet?.record?.loss },
      blitz: { rating: d.chess_blitz?.last?.rating, wins: d.chess_blitz?.record?.win, losses: d.chess_blitz?.record?.loss },
      rapid: { rating: d.chess_rapid?.last?.rating, wins: d.chess_rapid?.record?.win, losses: d.chess_rapid?.record?.loss },
      puzzle_rush: d.puzzle_rush?.best?.score,
      url: `https://www.chess.com/member/${args.username}`,
    }
  } catch { return { note: 'Chess.com unavailable' } }
}

// ── 28. Waifu.pics (no key — anime images) ────────────────
export async function anime_image(args: { type?: string }) {
  const type = args.type || 'waifu'
  try {
    const res = await fetch(`https://api.waifu.pics/sfw/${type}`, { signal: T() })
    if (!res.ok) throw new Error()
    const d = await res.json()
    return { url: d.url, type, source: 'waifu.pics (SFW)', note: 'Anime character image' }
  } catch { return { note: 'Unavailable', link: 'https://waifu.pics' } }
}


// ═══════════════════════════════════════════════════════════
// API-KEY TOOLS — Unlock with free-tier keys
// ═══════════════════════════════════════════════════════════

const ENV = {
  GITHUB: process.env.GITHUB_TOKEN || '',
  TMDB:   process.env.TMDB_API_KEY || '',
  GIPHY:  process.env.GIPHY_API_KEY || '',
  PEXELS: process.env.PEXELS_API_KEY || '',
  UNSPLASH: process.env.UNSPLASH_ACCESS_KEY || '',
  PIXABAY:  process.env.PIXABAY_API_KEY || '',
  LASTFM:   process.env.LASTFM_API_KEY || '',
  FREESOUND: process.env.FREESOUND_API_KEY || '',
  NOTION:   process.env.NOTION_API_KEY || '',
  TODOIST:  process.env.TODOIST_API_TOKEN || '',
  TRELLO_KEY: process.env.TRELLO_API_KEY || '',
  TRELLO_TOKEN: process.env.TRELLO_TOKEN || '',
  SPOTIFY_ID: process.env.SPOTIFY_CLIENT_ID || '',
  SPOTIFY_SECRET: process.env.SPOTIFY_CLIENT_SECRET || '',
  AIRTABLE: process.env.AIRTABLE_API_KEY || '',
  YOUTUBE: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY || '',
  OMDB: process.env.OMDB_API_KEY || '',
  GUARDIAN: process.env.GUARDIAN_API_KEY || '',
}

// ── 29. GitHub Auth API (5000 req/hr with token) ──────────
export async function github_my_repos(args: { sort?: string; limit?: number }) {
  if (!ENV.GITHUB) return { note: 'Add GITHUB_TOKEN for personal repos', link: 'https://github.com/settings/tokens' }
  try {
    const res = await fetch(`https://api.github.com/user/repos?sort=${args.sort || 'updated'}&per_page=${args.limit || 10}`,
      { headers: { Authorization: `Bearer ${ENV.GITHUB}`, Accept: 'application/vnd.github.v3+json' }, signal: T() })
    if (!res.ok) throw new Error()
    const d: any[] = await res.json()
    return d.map(r => ({
      name: r.name, description: r.description, private: r.private,
      stars: r.stargazers_count, language: r.language, url: r.html_url,
      updated: r.updated_at, default_branch: r.default_branch,
    }))
  } catch { return { note: 'GitHub API error' } }
}

export async function github_create_issue(args: { repo: string; title: string; body?: string; labels?: string[] }) {
  if (!ENV.GITHUB) return { note: 'GITHUB_TOKEN required' }
  try {
    const res = await fetch(`https://api.github.com/repos/${args.repo}/issues`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ENV.GITHUB}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: args.title, body: args.body || '', labels: args.labels || [] }),
      signal: T()
    })
    if (!res.ok) throw new Error()
    const d = await res.json()
    return { issue_number: d.number, title: d.title, url: d.html_url, state: d.state }
  } catch { return { note: 'Failed to create issue' } }
}

// ── 30. TMDB Movies (free key) ────────────────────────────
export async function tmdb_search(args: { query: string; type?: 'movie'|'tv'|'person' }) {
  if (!ENV.TMDB) {
    // Fallback to OMDB no-key
    return omdb_search({ query: args.query, type: args.type === 'tv' ? 'series' : 'movie' })
  }
  try {
    const type = args.type || 'movie'
    const res = await fetch(`https://api.themoviedb.org/3/search/${type}?api_key=${ENV.TMDB}&query=${encodeURIComponent(args.query)}&language=en-US&include_adult=false`, { signal: T() })
    if (!res.ok) throw new Error()
    const d = await res.json()
    return d.results?.slice(0, 6).map((m: any) => ({
      title: m.title || m.name, year: (m.release_date || m.first_air_date || '').slice(0, 4),
      overview: m.overview?.slice(0, 200), rating: m.vote_average?.toFixed(1),
      votes: m.vote_count, type, genre_ids: m.genre_ids,
      poster: m.poster_path ? `https://image.tmdb.org/t/p/w300${m.poster_path}` : null,
      backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/w780${m.backdrop_path}` : null,
      tmdb_url: `https://www.themoviedb.org/${type}/${m.id}`,
    }))
  } catch { return omdb_search({ query: args.query }) }
}

export async function tmdb_trending(args: { type?: 'movie'|'tv'|'all'; window?: 'day'|'week' }) {
  if (!ENV.TMDB) return { note: 'Add TMDB_API_KEY for trending', link: 'https://www.themoviedb.org/settings/api' }
  try {
    const res = await fetch(`https://api.themoviedb.org/3/trending/${args.type || 'all'}/${args.window || 'week'}?api_key=${ENV.TMDB}`, { signal: T() })
    if (!res.ok) throw new Error()
    const d = await res.json()
    return d.results?.slice(0, 8).map((m: any) => ({
      title: m.title || m.name, year: (m.release_date || m.first_air_date || '').slice(0, 4),
      overview: m.overview?.slice(0, 150), rating: m.vote_average?.toFixed(1),
      poster: m.poster_path ? `https://image.tmdb.org/t/p/w300${m.poster_path}` : null,
      type: m.media_type, tmdb_url: `https://www.themoviedb.org/${m.media_type}/${m.id}`,
    }))
  } catch { return { note: 'TMDB unavailable' } }
}

// ── 31. Giphy GIFs (free key — 1000 req/day) ─────────────
export async function giphy_search(args: { query: string; limit?: number; rating?: string }) {
  if (!ENV.GIPHY) return tenor_gifs(args)  // fallback to Tenor (no key)
  try {
    const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${ENV.GIPHY}&q=${encodeURIComponent(args.query)}&limit=${args.limit || 6}&rating=${args.rating || 'g'}`, { signal: T() })
    if (!res.ok) throw new Error()
    const d = await res.json()
    return d.data?.map((g: any) => ({
      title: g.title, url: g.images?.original?.url,
      thumb: g.images?.fixed_height_small?.url,
      mp4: g.images?.fixed_height?.mp4,
      width: g.images?.original?.width, height: g.images?.original?.height,
      giphy_url: g.url, embed_url: g.embed_url,
    }))
  } catch { return tenor_gifs(args) }
}

export async function giphy_trending(args: { limit?: number }) {
  if (!ENV.GIPHY) return { note: 'Add GIPHY_API_KEY for trending GIFs', link: 'https://developers.giphy.com/dashboard/' }
  try {
    const res = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${ENV.GIPHY}&limit=${args.limit || 6}&rating=g`, { signal: T() })
    if (!res.ok) throw new Error()
    const d = await res.json()
    return d.data?.map((g: any) => ({ title: g.title, url: g.images?.original?.url, thumb: g.images?.fixed_height_small?.url, giphy_url: g.url }))
  } catch { return { note: 'Giphy unavailable' } }
}

// ── 32. Pexels Photos + Videos (free key) ─────────────────
export async function pexels_search(args: { query: string; type?: 'photo'|'video'; per_page?: number }) {
  if (!ENV.PEXELS) return unsplash_random({ query: args.query, count: args.per_page || 5 })
  try {
    const endpoint = args.type === 'video'
      ? `https://api.pexels.com/videos/search?query=${encodeURIComponent(args.query)}&per_page=${args.per_page || 5}`
      : `https://api.pexels.com/v1/search?query=${encodeURIComponent(args.query)}&per_page=${args.per_page || 5}`
    const res = await fetch(endpoint, { headers: { Authorization: ENV.PEXELS }, signal: T() })
    if (!res.ok) throw new Error()
    const d = await res.json()
    if (args.type === 'video') {
      return d.videos?.map((v: any) => ({
        id: v.id, url: v.url, duration: v.duration,
        thumb: v.image, width: v.width, height: v.height,
        video_files: v.video_files?.filter((f: any) => f.quality === 'hd')?.slice(0, 1).map((f: any) => f.link),
        photographer: v.user?.name,
      }))
    }
    return d.photos?.map((p: any) => ({
      id: p.id, url: p.url, src: p.src?.large, thumb: p.src?.medium,
      photographer: p.photographer, width: p.width, height: p.height,
      avg_color: p.avg_color,
    }))
  } catch { return unsplash_random({ query: args.query }) }
}

// ── 33. Unsplash Photos (free key — 50 req/hr) ────────────
export async function unsplash_search(args: { query: string; per_page?: number; orientation?: string }) {
  if (!ENV.UNSPLASH) return unsplash_random({ query: args.query, count: args.per_page || 5 })
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(args.query)}&per_page=${args.per_page || 6}&orientation=${args.orientation || 'landscape'}`,
      { headers: { Authorization: `Client-ID ${ENV.UNSPLASH}` }, signal: T() }
    )
    if (!res.ok) throw new Error()
    const d = await res.json()
    return d.results?.map((p: any) => ({
      id: p.id, description: p.alt_description,
      url: p.urls?.regular, thumb: p.urls?.small,
      full: p.urls?.full, photographer: p.user?.name,
      photographer_url: p.user?.links?.html,
      unsplash_url: p.links?.html,
      color: p.color, width: p.width, height: p.height,
    }))
  } catch { return unsplash_random({ query: args.query }) }
}

// ── 34. Pixabay Photos + Videos (free key) ────────────────
export async function pixabay_search(args: { query: string; type?: 'photo'|'video'|'illustration'|'vector'; per_page?: number }) {
  if (!ENV.PIXABAY) return unsplash_random({ query: args.query, count: args.per_page || 5 })
  try {
    const isVideo = args.type === 'video'
    const endpoint = isVideo
      ? `https://pixabay.com/api/videos/?key=${ENV.PIXABAY}&q=${encodeURIComponent(args.query)}&per_page=${args.per_page || 5}`
      : `https://pixabay.com/api/?key=${ENV.PIXABAY}&q=${encodeURIComponent(args.query)}&image_type=${args.type || 'photo'}&per_page=${args.per_page || 6}&safesearch=true`
    const res = await fetch(endpoint, { signal: T() })
    if (!res.ok) throw new Error()
    const d = await res.json()
    if (isVideo) {
      return d.hits?.map((v: any) => ({
        id: v.id, thumb: v.videos?.small?.url, tags: v.tags,
        views: v.views, downloads: v.downloads,
        video_url: v.videos?.medium?.url || v.videos?.small?.url,
        pageURL: v.pageURL,
      }))
    }
    return d.hits?.map((p: any) => ({
      id: p.id, thumb: p.previewURL, url: p.webformatURL, full: p.largeImageURL,
      tags: p.tags, views: p.views, downloads: p.downloads, likes: p.likes,
      width: p.imageWidth, height: p.imageHeight, pageURL: p.pageURL,
    }))
  } catch { return unsplash_random({ query: args.query }) }
}

// ── 35. Last.fm Music Info (free key) ─────────────────────
export async function lastfm_artist_info(args: { artist: string }) {
  if (!ENV.LASTFM) return musicbrainz_artist({ query: args.artist })  // fallback
  try {
    const res = await fetch(`https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(args.artist)}&api_key=${ENV.LASTFM}&format=json`, { signal: T() })
    if (!res.ok) throw new Error()
    const d = await res.json()
    const a = d.artist
    return {
      name: a.name, listeners: a.stats?.listeners, playcount: a.stats?.playcount,
      bio: a.bio?.summary?.replace(/<[^>]+>/g, '')?.slice(0, 300),
      tags: a.tags?.tag?.map((t: any) => t.name),
      similar: a.similar?.artist?.map((s: any) => s.name),
      url: a.url,
    }
  } catch { return musicbrainz_artist({ query: args.artist }) }
}

export async function lastfm_top_charts(args: { type?: 'tracks'|'artists'|'albums'; country?: string }) {
  if (!ENV.LASTFM) return deezer_chart({})
  try {
    const method = args.country
      ? `geo.gettoptracks&country=${encodeURIComponent(args.country)}`
      : `chart.gettop${args.type || 'tracks'}`
    const res = await fetch(`https://ws.audioscrobbler.com/2.0/?method=${method}&api_key=${ENV.LASTFM}&format=json&limit=10`, { signal: T() })
    if (!res.ok) throw new Error()
    const d = await res.json()
    const tracks = d.tracks?.track || d.artists?.artist || d.albums?.album
    return tracks?.map((t: any) => ({
      rank: t['@attr']?.rank,
      name: t.name, artist: t.artist?.name || t.name,
      listeners: t.listeners || t.playcount,
      url: t.url,
    }))
  } catch { return deezer_chart({}) }
}

// ── 36. Spotify Search (needs OAuth — public search via proxy) ─
export async function spotify_search(args: { query: string; type?: 'track'|'artist'|'album'|'playlist' }) {
  // Try to get Spotify token via Client Credentials (no user auth needed for search)
  if (!ENV.SPOTIFY_ID || !ENV.SPOTIFY_SECRET) {
    return deezer_search(args)  // fallback to Deezer (no key)
  }
  try {
    // Get access token
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${ENV.SPOTIFY_ID}:${ENV.SPOTIFY_SECRET}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: T(),
    })
    if (!tokenRes.ok) throw new Error('Spotify auth failed')
    const token = await tokenRes.json()
    const type = args.type || 'track'
    const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(args.query)}&type=${type}&limit=5&market=IN`,
      { headers: { Authorization: `Bearer ${token.access_token}` }, signal: T() })
    if (!res.ok) throw new Error()
    const d = await res.json()
    if (type === 'track') {
      return d.tracks?.items?.map((t: any) => ({
        title: t.name, artists: t.artists?.map((a: any) => a.name), album: t.album?.name,
        duration: `${Math.floor(t.duration_ms/60000)}:${String(Math.floor((t.duration_ms%60000)/1000)).padStart(2,'0')}`,
        preview_url: t.preview_url, // 30-sec preview
        album_cover: t.album?.images?.[1]?.url, spotify_url: t.external_urls?.spotify,
        popularity: t.popularity,
      }))
    }
    if (type === 'artist') {
      return d.artists?.items?.map((a: any) => ({
        name: a.name, genres: a.genres?.slice(0, 3), popularity: a.popularity,
        followers: a.followers?.total, image: a.images?.[1]?.url, spotify_url: a.external_urls?.spotify,
      }))
    }
    return d[`${type}s`]?.items?.slice(0, 5)
  } catch { return deezer_search(args) }
}

// ── 37. Notion Databases (API key) ────────────────────────
export async function notion_search(args: { query: string; filter?: 'page'|'database' }) {
  if (!ENV.NOTION) return { note: 'Add NOTION_API_KEY to connect Notion', link: 'https://www.notion.so/my-integrations' }
  try {
    const body: any = { query: args.query }
    if (args.filter) body.filter = { value: args.filter, property: 'object' }
    const res = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ENV.NOTION}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: T(),
    })
    if (!res.ok) throw new Error()
    const d = await res.json()
    return d.results?.slice(0, 6).map((p: any) => ({
      type: p.object, id: p.id,
      title: p.properties?.title?.title?.[0]?.plain_text || p.title?.[0]?.plain_text || 'Untitled',
      url: p.url, last_edited: p.last_edited_time,
    }))
  } catch { return { note: 'Notion API error' } }
}

// ── 38. Todoist Tasks (API token) ─────────────────────────
export async function todoist_tasks(args: { filter?: string; project?: string; limit?: number }) {
  if (!ENV.TODOIST) return { note: 'Add TODOIST_API_TOKEN for tasks', link: 'https://todoist.com/prefs/integrations' }
  try {
    const params = new URLSearchParams()
    if (args.filter) params.set('filter', args.filter)
    if (args.project) params.set('project_id', args.project)
    const res = await fetch(`https://api.todoist.com/rest/v2/tasks?${params}`,
      { headers: { Authorization: `Bearer ${ENV.TODOIST}` }, signal: T() })
    if (!res.ok) throw new Error()
    const d: any[] = await res.json()
    return d.slice(0, args.limit || 10).map(t => ({
      id: t.id, content: t.content, priority: t.priority,
      due: t.due?.datetime || t.due?.date,
      project_id: t.project_id, labels: t.labels, url: t.url,
    }))
  } catch { return { note: 'Todoist API error' } }
}

export async function todoist_add_task(args: { content: string; due_string?: string; priority?: number; labels?: string[] }) {
  if (!ENV.TODOIST) return { note: 'TODOIST_API_TOKEN required' }
  try {
    const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ENV.TODOIST}`, 'Content-Type': 'application/json', 'X-Request-Id': crypto.randomUUID?.() || Date.now().toString() },
      body: JSON.stringify({ content: args.content, due_string: args.due_string, priority: args.priority || 1, labels: args.labels || [] }),
      signal: T(),
    })
    if (!res.ok) throw new Error()
    const d = await res.json()
    return { id: d.id, content: d.content, due: d.due?.datetime || d.due?.date, url: d.url, created: d.created_at }
  } catch { return { note: 'Failed to add task' } }
}

// ── 39. YouTube Search (free key — 100 units/day) ─────────
export async function youtube_search_api(args: { query: string; type?: string; max_results?: number }) {
  if (!ENV.YOUTUBE) {
    // Fallback to Invidious (no key needed)
    try {
      const res = await fetch(`https://iv.datura.network/api/v1/search?q=${encodeURIComponent(args.query)}&type=${args.type || 'video'}&page=1`, { signal: T(6000) })
      if (!res.ok) throw new Error()
      const d: any[] = await res.json()
      return d.slice(0, args.max_results || 5).map(v => ({
        title: v.title, channel: v.author, views: v.viewCount,
        duration: v.lengthSeconds ? `${Math.floor(v.lengthSeconds/60)}:${String(v.lengthSeconds%60).padStart(2,'0')}` : null,
        thumb: v.videoThumbnails?.[0]?.url,
        url: `https://www.youtube.com/watch?v=${v.videoId}`, videoId: v.videoId,
      }))
    } catch { return { note: 'Add YOUTUBE_API_KEY for YouTube search', link: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com' } }
  }
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(args.query)}&maxResults=${args.max_results || 5}&type=${args.type || 'video'}&key=${ENV.YOUTUBE}`,
      { signal: T() }
    )
    if (!res.ok) throw new Error()
    const d = await res.json()
    return d.items?.map((v: any) => ({
      title: v.snippet?.title, channel: v.snippet?.channelTitle,
      description: v.snippet?.description?.slice(0, 100),
      published: v.snippet?.publishedAt?.slice(0, 10),
      thumb: v.snippet?.thumbnails?.medium?.url,
      videoId: v.id?.videoId || v.id?.playlistId,
      url: v.id?.videoId ? `https://www.youtube.com/watch?v=${v.id.videoId}` : `https://www.youtube.com/playlist?list=${v.id?.playlistId}`,
    }))
  } catch { return { note: 'YouTube search failed' } }
}

// ── 40. Guardian News (free key — 500 req/day) ────────────
export async function guardian_news(args: { query: string; section?: string; from_date?: string; limit?: number }) {
  if (!ENV.GUARDIAN) {
    // Fallback to NewsAPI RSS
    return { note: 'Add GUARDIAN_API_KEY for premium news', link: 'https://open-platform.theguardian.com/access/' }
  }
  try {
    const params = new URLSearchParams({
      q: args.query, 'api-key': ENV.GUARDIAN, 'show-fields': 'trailText,thumbnail',
      'page-size': String(args.limit || 6),
    })
    if (args.section) params.set('section', args.section)
    if (args.from_date) params.set('from-date', args.from_date)
    const res = await fetch(`https://content.guardianapis.com/search?${params}`, { signal: T() })
    if (!res.ok) throw new Error()
    const d = await res.json()
    return d.response?.results?.map((a: any) => ({
      title: a.webTitle, section: a.sectionName, date: a.webPublicationDate?.slice(0, 10),
      url: a.webUrl, trail: a.fields?.trailText?.replace(/<[^>]+>/g, ''),
      thumbnail: a.fields?.thumbnail,
    }))
  } catch { return { note: 'Guardian API error' } }
}

// Export all no-key tools for registry
export const NO_KEY_CONNECTED = [
  'github_trending', 'github_repo', 'github_user', 'github_search_code',
  'npm_search', 'npm_package_info', 'pypi_search',
  'deezer_search', 'deezer_chart', 'musicbrainz_artist',
  'openlib_search', 'gutenberg_search', 'freesound_browse',
  'tenor_gifs', 'omdb_search', 'omdb_detail', 'anime_search',
  'unsplash_random', 'picsum_image',
  'stackoverflow_search', 'ip_info', 'exchange_rate_free', 'country_info',
  'codeforces_user', 'leetcode_stats', 'chess_stats',
  'get_synonyms', 'get_rhymes', 'wikipedia_image', 'list_public_apis',
]

export const API_KEY_CONNECTED = [
  'github_my_repos', 'github_create_issue',
  'tmdb_search', 'tmdb_trending',
  'giphy_search', 'giphy_trending',
  'pexels_search', 'unsplash_search', 'pixabay_search',
  'lastfm_artist_info', 'lastfm_top_charts',
  'spotify_search',
  'notion_search', 'todoist_tasks', 'todoist_add_task',
  'youtube_search_api', 'guardian_news',
]
