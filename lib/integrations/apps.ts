// lib/integrations/apps.ts — JARVIS Apps Hub v1
// 50+ apps, zero OAuth, zero API key
// Pure deep-links + context-aware URL building

export interface AppDef {
  id: string
  name: string
  emoji: string
  category: Category
  desc: string          // short Hinglish description
  tags: string[]        // for smart matching
  baseUrl: string       // homepage / default action
  actions?: AppAction[] // specific actions with dynamic URLs
  india?: boolean       // India-specific app
}

export interface AppAction {
  id: string
  label: string
  icon: string
  url: (query?: string) => string
  tooltip?: string
}

export type Category =
  | 'AI Tools'
  | 'Design'
  | 'Code'
  | 'Docs'
  | 'Productivity'
  | 'Media'
  | 'Images'
  | 'PDF & Files'
  | 'Education'
  | 'India'
  | 'Communication'
  | 'Finance'

// ═══════════════════════════════════════════════════════════
// MASTER REGISTRY
// ═══════════════════════════════════════════════════════════
export const APPS: AppDef[] = [

  // ── AI TOOLS ────────────────────────────────────────────
  {
    id: 'chatgpt', name: 'ChatGPT', emoji: '🤖', category: 'AI Tools',
    desc: 'OpenAI ka GPT-4o — har sawaal ka jawab',
    tags: ['ai','chatgpt','openai','gpt','chat'],
    baseUrl: 'https://chat.openai.com',
    actions: [
      { id: 'new',    label: 'New Chat',    icon: '💬', url: (q) => q ? `https://chat.openai.com/?q=${encodeURIComponent(q)}` : 'https://chat.openai.com' },
      { id: 'gpt4o',  label: 'GPT-4o',     icon: '⚡', url: (q) => `https://chat.openai.com/?model=gpt-4o${q?'&q='+encodeURIComponent(q):''}` },
    ]
  },
  {
    id: 'gemini', name: 'Google Gemini', emoji: '🌟', category: 'AI Tools',
    desc: 'Google ka Gemini 1.5 Pro — free mein best',
    tags: ['ai','gemini','google','bard','flash'],
    baseUrl: 'https://gemini.google.com',
    actions: [
      { id: 'chat', label: 'Open Gemini', icon: '🌟', url: (q) => q ? `https://gemini.google.com/app?q=${encodeURIComponent(q)}` : 'https://gemini.google.com' },
    ]
  },
  {
    id: 'perplexity', name: 'Perplexity AI', emoji: '🔎', category: 'AI Tools',
    desc: 'AI search engine — web + AI ek saath',
    tags: ['ai','search','perplexity','web','research'],
    baseUrl: 'https://perplexity.ai',
    actions: [
      { id: 'search', label: 'Search', icon: '🔍', url: (q) => q ? `https://www.perplexity.ai/search?q=${encodeURIComponent(q)}` : 'https://perplexity.ai' },
    ]
  },
  {
    id: 'claude', name: 'Claude (Anthropic)', emoji: '🎭', category: 'AI Tools',
    desc: 'Anthropic ka Claude — deep analysis ke liye',
    tags: ['ai','claude','anthropic','sonnet'],
    baseUrl: 'https://claude.ai',
    actions: [
      { id: 'new', label: 'New Chat', icon: '💬', url: () => 'https://claude.ai/new' },
    ]
  },
  {
    id: 'copilot', name: 'Microsoft Copilot', emoji: '🪟', category: 'AI Tools',
    desc: 'Microsoft + GPT-4 — free mein',
    tags: ['ai','copilot','microsoft','bing','gpt'],
    baseUrl: 'https://copilot.microsoft.com',
    actions: [
      { id: 'chat', label: 'Open', icon: '🪟', url: (q) => q ? `https://copilot.microsoft.com/?q=${encodeURIComponent(q)}` : 'https://copilot.microsoft.com' },
    ]
  },
  {
    id: 'mistral', name: 'Mistral Le Chat', emoji: '🌊', category: 'AI Tools',
    desc: 'European open-source AI — fast & free',
    tags: ['ai','mistral','lechant','france'],
    baseUrl: 'https://chat.mistral.ai',
  },
  {
    id: 'poe', name: 'Poe', emoji: '📡', category: 'AI Tools',
    desc: 'Sab AI ek jagah — GPT, Claude, Llama',
    tags: ['ai','poe','quora','multi','llm'],
    baseUrl: 'https://poe.com',
  },

  // ── DESIGN ──────────────────────────────────────────────
  {
    id: 'canva', name: 'Canva', emoji: '🎨', category: 'Design',
    desc: 'Posters, social media, resume — sab kuch',
    tags: ['design','canva','poster','resume','social'],
    baseUrl: 'https://www.canva.com',
    actions: [
      { id: 'new',       label: 'New Design',      icon: '✨', url: () => 'https://www.canva.com/design/new' },
      { id: 'insta',     label: 'Instagram Post',  icon: '📸', url: () => 'https://www.canva.com/create/instagram-posts/' },
      { id: 'resume',    label: 'Resume',          icon: '📄', url: () => 'https://www.canva.com/create/resumes/' },
      { id: 'poster',    label: 'Poster',          icon: '🖼️', url: () => 'https://www.canva.com/create/posters/' },
      { id: 'logo',      label: 'Logo',            icon: '✨', url: () => 'https://www.canva.com/create/logos/' },
      { id: 'templates', label: 'Templates',       icon: '📚', url: (q) => q ? `https://www.canva.com/search/templates?q=${encodeURIComponent(q)}` : 'https://www.canva.com/templates/' },
    ]
  },
  {
    id: 'figma', name: 'Figma', emoji: '🖊️', category: 'Design',
    desc: 'Pro UI/UX design tool — collaborative',
    tags: ['design','figma','ui','ux','prototype','wireframe'],
    baseUrl: 'https://www.figma.com',
    actions: [
      { id: 'new',       label: 'New File',    icon: '✨', url: () => 'https://www.figma.com/design/new' },
      { id: 'community', label: 'Community',   icon: '🌐', url: (q) => q ? `https://www.figma.com/community/search?resource_type=files&query=${encodeURIComponent(q)}` : 'https://www.figma.com/community' },
    ]
  },
  {
    id: 'excalidraw', name: 'Excalidraw', emoji: '✏️', category: 'Design',
    desc: 'Free whiteboard/diagram tool — instant, offline bhi',
    tags: ['whiteboard','diagram','draw','sketch','excalidraw','flowchart'],
    baseUrl: 'https://excalidraw.com',
    actions: [
      { id: 'new', label: 'New Drawing', icon: '✏️', url: () => 'https://excalidraw.com' },
    ]
  },
  {
    id: 'remove_bg', name: 'Remove.bg', emoji: '🪄', category: 'Design',
    desc: 'Background hatao — 1 second mein',
    tags: ['background','remove','photo','edit','cutout'],
    baseUrl: 'https://www.remove.bg',
    actions: [
      { id: 'upload', label: 'Remove BG', icon: '🪄', url: () => 'https://www.remove.bg/upload' },
    ]
  },
  {
    id: 'adobe_express', name: 'Adobe Express', emoji: '🔴', category: 'Design',
    desc: 'Adobe ka free design tool',
    tags: ['design','adobe','express','social','quick'],
    baseUrl: 'https://new.express.adobe.com',
  },
  {
    id: 'leonardo', name: 'Leonardo AI', emoji: '🦁', category: 'Design',
    desc: 'AI art/image generator — best free tier',
    tags: ['ai','image','art','generate','leonardo','stable diffusion'],
    baseUrl: 'https://leonardo.ai',
  },
  {
    id: 'ideogram', name: 'Ideogram', emoji: '🖼️', category: 'Design',
    desc: 'AI images with text — perfect typography',
    tags: ['ai','image','text','ideogram'],
    baseUrl: 'https://ideogram.ai',
  },

  // ── CODE ────────────────────────────────────────────────
  {
    id: 'github', name: 'GitHub', emoji: '🐙', category: 'Code',
    desc: 'Code host karo, collaborate karo',
    tags: ['code','github','git','repo','open source'],
    baseUrl: 'https://github.com',
    actions: [
      { id: 'new_repo',  label: 'New Repo',  icon: '📦', url: () => 'https://github.com/new' },
      { id: 'gist',      label: 'New Gist',  icon: '📋', url: () => 'https://gist.github.com' },
      { id: 'codespace', label: 'Codespace', icon: '☁️', url: () => 'https://github.com/codespaces/new' },
      { id: 'search',    label: 'Search',    icon: '🔍', url: (q) => q ? `https://github.com/search?q=${encodeURIComponent(q)}` : 'https://github.com/explore' },
    ]
  },
  {
    id: 'replit', name: 'Replit', emoji: '🔄', category: 'Code',
    desc: 'Browser mein code karo — 50+ languages',
    tags: ['code','replit','run','browser','ide'],
    baseUrl: 'https://replit.com',
    actions: [
      { id: 'new',    label: 'New Repl',   icon: '✨', url: () => 'https://replit.com/new' },
      { id: 'python', label: 'Python',     icon: '🐍', url: () => 'https://replit.com/new/python3' },
      { id: 'web',    label: 'HTML/CSS/JS',icon: '🌐', url: () => 'https://replit.com/new/html' },
    ]
  },
  {
    id: 'codepen', name: 'CodePen', emoji: '🖊️', category: 'Code',
    desc: 'HTML/CSS/JS live playground',
    tags: ['code','codepen','html','css','js','frontend'],
    baseUrl: 'https://codepen.io',
    actions: [
      { id: 'new', label: 'New Pen', icon: '✨', url: () => 'https://codepen.io/pen/' },
    ]
  },
  {
    id: 'stackblitz', name: 'StackBlitz', emoji: '⚡', category: 'Code',
    desc: 'React, Next.js, Vue — browser mein',
    tags: ['code','react','nextjs','vue','stackblitz','ide'],
    baseUrl: 'https://stackblitz.com',
    actions: [
      { id: 'react',  label: 'React',   icon: '⚛️', url: () => 'https://stackblitz.com/fork/react' },
      { id: 'nextjs', label: 'Next.js', icon: '▲', url: () => 'https://stackblitz.com/fork/nextjs' },
      { id: 'node',   label: 'Node.js', icon: '🟢', url: () => 'https://stackblitz.com/fork/node' },
    ]
  },
  {
    id: 'jsfiddle', name: 'JSFiddle', emoji: '🎻', category: 'Code',
    desc: 'Quick JS/CSS demos share karo',
    tags: ['code','js','fiddle','demo','snippet'],
    baseUrl: 'https://jsfiddle.net',
    actions: [
      { id: 'new', label: 'New Fiddle', icon: '✨', url: () => 'https://jsfiddle.net' },
    ]
  },
  {
    id: 'colab', name: 'Google Colab', emoji: '📓', category: 'Code',
    desc: 'Python notebooks — ML/Data science free GPU',
    tags: ['python','colab','notebook','ml','data','gpu'],
    baseUrl: 'https://colab.research.google.com',
    actions: [
      { id: 'new',     label: 'New Notebook', icon: '📓', url: () => 'https://colab.research.google.com/#create=true' },
      { id: 'search',  label: 'Search',       icon: '🔍', url: (q) => q ? `https://colab.research.google.com/search#q=${encodeURIComponent(q)}` : 'https://colab.research.google.com' },
    ]
  },

  // ── DOCS ────────────────────────────────────────────────
  {
    id: 'gdocs', name: 'Google Docs', emoji: '📝', category: 'Docs',
    desc: 'Documents banao — free, cloud save',
    tags: ['docs','document','write','google','word'],
    baseUrl: 'https://docs.google.com',
    actions: [
      { id: 'new', label: 'New Doc', icon: '📝', url: () => 'https://docs.new' },
    ]
  },
  {
    id: 'gsheets', name: 'Google Sheets', emoji: '📊', category: 'Docs',
    desc: 'Spreadsheets — Excel ka free alternative',
    tags: ['sheets','spreadsheet','excel','google','data'],
    baseUrl: 'https://sheets.google.com',
    actions: [
      { id: 'new', label: 'New Sheet', icon: '📊', url: () => 'https://sheets.new' },
    ]
  },
  {
    id: 'gslides', name: 'Google Slides', emoji: '📽️', category: 'Docs',
    desc: 'Presentations — PowerPoint free alternative',
    tags: ['slides','presentation','ppt','google'],
    baseUrl: 'https://slides.google.com',
    actions: [
      { id: 'new', label: 'New Slides', icon: '📽️', url: () => 'https://slides.new' },
    ]
  },
  {
    id: 'notion', name: 'Notion', emoji: '🔲', category: 'Docs',
    desc: 'All-in-one workspace — notes, DB, wiki',
    tags: ['notion','notes','wiki','database','workspace'],
    baseUrl: 'https://notion.so',
    actions: [
      { id: 'new',    label: 'New Page', icon: '📄', url: () => 'https://notion.so/new' },
      { id: 'search', label: 'Search',   icon: '🔍', url: (q) => q ? `https://www.notion.so/search?query=${encodeURIComponent(q)}` : 'https://notion.so' },
    ]
  },
  {
    id: 'pastebin', name: 'Pastebin', emoji: '📋', category: 'Docs',
    desc: 'Code/text snippets share karo instantly',
    tags: ['paste','share','text','code','snippet'],
    baseUrl: 'https://pastebin.com',
    actions: [
      { id: 'new', label: 'New Paste', icon: '📋', url: () => 'https://pastebin.com' },
    ]
  },

  // ── PRODUCTIVITY ────────────────────────────────────────
  {
    id: 'gcal', name: 'Google Calendar', emoji: '📅', category: 'Productivity',
    desc: 'Schedule karo, events banao',
    tags: ['calendar','schedule','event','reminder','google'],
    baseUrl: 'https://calendar.google.com',
    actions: [
      { id: 'new',   label: 'New Event', icon: '➕', url: () => 'https://calendar.google.com/calendar/r/eventedit' },
      { id: 'today', label: 'Today',     icon: '📅', url: () => 'https://calendar.google.com/calendar/r/day' },
      { id: 'week',  label: 'Week View', icon: '🗓️', url: () => 'https://calendar.google.com/calendar/r/week' },
    ]
  },
  {
    id: 'trello', name: 'Trello', emoji: '📌', category: 'Productivity',
    desc: 'Kanban boards — tasks manage karo',
    tags: ['trello','kanban','tasks','project','manage'],
    baseUrl: 'https://trello.com',
    actions: [
      { id: 'new', label: 'New Board', icon: '📌', url: () => 'https://trello.com/create-first-team' },
    ]
  },
  {
    id: 'todoist', name: 'Todoist', emoji: '✅', category: 'Productivity',
    desc: 'To-do list — best task manager',
    tags: ['todo','tasks','list','productivity'],
    baseUrl: 'https://todoist.com',
    actions: [
      { id: 'new', label: 'New Task', icon: '➕', url: () => 'https://todoist.com/app/today' },
    ]
  },
  {
    id: 'miro', name: 'Miro', emoji: '🟡', category: 'Productivity',
    desc: 'Online whiteboard — team collaboration',
    tags: ['whiteboard','miro','collaborate','board','sticky'],
    baseUrl: 'https://miro.com',
    actions: [
      { id: 'new', label: 'New Board', icon: '🟡', url: () => 'https://miro.com/app/board/new/' },
    ]
  },
  {
    id: 'loom', name: 'Loom', emoji: '🎥', category: 'Productivity',
    desc: 'Screen record karo + share karo instantly',
    tags: ['screen','record','loom','share','video'],
    baseUrl: 'https://www.loom.com',
    actions: [
      { id: 'record', label: 'Start Recording', icon: '🎥', url: () => 'https://www.loom.com/record' },
    ]
  },

  // ── MEDIA ───────────────────────────────────────────────
  {
    id: 'youtube', name: 'YouTube', emoji: '▶️', category: 'Media',
    desc: 'Videos dekho, upload karo',
    tags: ['youtube','video','watch','music','stream'],
    baseUrl: 'https://youtube.com',
    actions: [
      { id: 'search',   label: 'Search',      icon: '🔍', url: (q) => q ? `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` : 'https://youtube.com' },
      { id: 'upload',   label: 'Upload',      icon: '⬆️', url: () => 'https://studio.youtube.com' },
      { id: 'shorts',   label: 'Shorts',      icon: '📱', url: () => 'https://www.youtube.com/shorts' },
      { id: 'trending', label: 'Trending IN', icon: '🔥', url: () => 'https://www.youtube.com/feed/trending?gl=IN' },
    ]
  },
  {
    id: 'spotify', name: 'Spotify', emoji: '🎵', category: 'Media',
    desc: 'Music suno — free tier available',
    tags: ['music','spotify','song','playlist','stream'],
    baseUrl: 'https://open.spotify.com',
    actions: [
      { id: 'search', label: 'Search',  icon: '🔍', url: (q) => q ? `https://open.spotify.com/search/${encodeURIComponent(q)}` : 'https://open.spotify.com' },
      { id: 'new',    label: 'New Playlist', icon: '➕', url: () => 'https://open.spotify.com' },
    ]
  },

  // ── IMAGES ──────────────────────────────────────────────
  {
    id: 'unsplash', name: 'Unsplash', emoji: '📷', category: 'Images',
    desc: 'Free HD photos — no copyright',
    tags: ['photos','images','free','hd','unsplash'],
    baseUrl: 'https://unsplash.com',
    actions: [
      { id: 'search', label: 'Search Photos', icon: '🔍', url: (q) => q ? `https://unsplash.com/s/photos/${encodeURIComponent(q)}` : 'https://unsplash.com' },
    ]
  },
  {
    id: 'pexels', name: 'Pexels', emoji: '🌄', category: 'Images',
    desc: 'Free stock photos + videos',
    tags: ['photos','images','free','video','pexels'],
    baseUrl: 'https://www.pexels.com',
    actions: [
      { id: 'search',       label: 'Photos',       icon: '📷', url: (q) => q ? `https://www.pexels.com/search/${encodeURIComponent(q)}/` : 'https://pexels.com' },
      { id: 'search_video', label: 'Videos',       icon: '🎬', url: (q) => q ? `https://www.pexels.com/search/videos/${encodeURIComponent(q)}/` : 'https://pexels.com/videos' },
    ]
  },
  {
    id: 'squoosh', name: 'Squoosh', emoji: '🗜️', category: 'Images',
    desc: 'Image compress karo — Google ka tool',
    tags: ['compress','image','optimize','squoosh','size'],
    baseUrl: 'https://squoosh.app',
  },
  {
    id: 'tinypng', name: 'TinyPNG', emoji: '🐼', category: 'Images',
    desc: 'PNG/JPG compress karo — 80% size kam',
    tags: ['compress','png','jpg','image','tiny'],
    baseUrl: 'https://tinypng.com',
  },
  {
    id: 'flaticon', name: 'Flaticon', emoji: '⭐', category: 'Images',
    desc: 'Free icons — 10M+ available',
    tags: ['icons','svg','png','free','flaticon'],
    baseUrl: 'https://www.flaticon.com',
    actions: [
      { id: 'search', label: 'Search Icons', icon: '🔍', url: (q) => q ? `https://www.flaticon.com/search?word=${encodeURIComponent(q)}` : 'https://flaticon.com' },
    ]
  },

  // ── PDF & FILES ─────────────────────────────────────────
  {
    id: 'ilovepdf', name: 'iLovePDF', emoji: '❤️', category: 'PDF & Files',
    desc: 'PDF merge, split, compress, convert',
    tags: ['pdf','merge','split','compress','convert'],
    baseUrl: 'https://www.ilovepdf.com',
    actions: [
      { id: 'merge',    label: 'Merge PDFs',  icon: '🔗', url: () => 'https://www.ilovepdf.com/merge_pdf' },
      { id: 'compress', label: 'Compress',    icon: '🗜️', url: () => 'https://www.ilovepdf.com/compress_pdf' },
      { id: 'word',     label: 'PDF to Word', icon: '📝', url: () => 'https://www.ilovepdf.com/pdf_to_word' },
      { id: 'ppt',      label: 'PDF to PPT',  icon: '📊', url: () => 'https://www.ilovepdf.com/pdf_to_powerpoint' },
    ]
  },
  {
    id: 'smallpdf', name: 'SmallPDF', emoji: '📄', category: 'PDF & Files',
    desc: 'PDF tools — easy & fast',
    tags: ['pdf','tools','convert','smallpdf'],
    baseUrl: 'https://smallpdf.com',
    actions: [
      { id: 'compress', label: 'Compress', icon: '🗜️', url: () => 'https://smallpdf.com/compress-pdf' },
      { id: 'word',     label: 'To Word',  icon: '📝', url: () => 'https://smallpdf.com/pdf-to-word' },
    ]
  },

  // ── EDUCATION ───────────────────────────────────────────
  {
    id: 'wolfram', name: 'Wolfram Alpha', emoji: '🧮', category: 'Education',
    desc: 'Math, science, data — instant answers',
    tags: ['math','wolfram','calculate','science','formula'],
    baseUrl: 'https://www.wolframalpha.com',
    actions: [
      { id: 'compute', label: 'Compute', icon: '🧮', url: (q) => q ? `https://www.wolframalpha.com/input?i=${encodeURIComponent(q)}` : 'https://wolframalpha.com' },
    ]
  },
  {
    id: 'desmos', name: 'Desmos', emoji: '📈', category: 'Education',
    desc: 'Free graphing calculator — NEET ke liye must',
    tags: ['graph','calculator','math','desmos','plot','function'],
    baseUrl: 'https://www.desmos.com',
    actions: [
      { id: 'graph', label: 'Graphing',  icon: '📈', url: () => 'https://www.desmos.com/calculator' },
      { id: 'sci',   label: 'Scientific', icon: '🔬', url: () => 'https://www.desmos.com/scientific' },
    ]
  },
  {
    id: 'khan', name: 'Khan Academy', emoji: '🎓', category: 'Education',
    desc: 'Free education — Physics, Math, Chemistry',
    tags: ['study','learn','khan','free','physics','math','neet'],
    baseUrl: 'https://www.khanacademy.org',
    actions: [
      { id: 'search', label: 'Search', icon: '🔍', url: (q) => q ? `https://www.khanacademy.org/search?page_search_query=${encodeURIComponent(q)}` : 'https://khanacademy.org' },
    ]
  },
  {
    id: 'pw', name: 'Physics Wallah', emoji: '🧪', category: 'Education',
    desc: 'Alakh sir ka NEET/JEE — best free content',
    tags: ['neet','jee','pw','physics wallah','alakh','study'],
    baseUrl: 'https://www.pw.live',
    india: true,
    actions: [
      { id: 'open',   label: 'Open PW',    icon: '🧪', url: () => 'https://www.pw.live' },
      { id: 'neet',   label: 'NEET Prep',  icon: '🩺', url: () => 'https://www.pw.live/courses/neet' },
    ]
  },
  {
    id: 'unacademy', name: 'Unacademy', emoji: '📚', category: 'Education',
    desc: 'NEET, JEE, UPSC — top educators',
    tags: ['neet','jee','upsc','unacademy','learn'],
    baseUrl: 'https://unacademy.com',
    india: true,
  },

  // ── INDIA ───────────────────────────────────────────────
  {
    id: 'irctc', name: 'IRCTC', emoji: '🚂', category: 'India',
    desc: 'Train ticket book karo — official',
    tags: ['train','ticket','irctc','railway','pnr','book'],
    baseUrl: 'https://www.irctc.co.in',
    india: true,
    actions: [
      { id: 'book',   label: 'Book Ticket', icon: '🎫', url: () => 'https://www.irctc.co.in/nget/train-search' },
      { id: 'pnr',    label: 'PNR Status',  icon: '🔍', url: () => 'https://www.irctc.co.in/nget/pnr-status' },
    ]
  },
  {
    id: 'gpay', name: 'Google Pay', emoji: '💚', category: 'India',
    desc: 'UPI payment — fast & safe',
    tags: ['gpay','upi','payment','money','send','google pay'],
    baseUrl: 'https://pay.google.com',
    india: true,
    actions: [
      { id: 'open', label: 'Open GPay', icon: '💚', url: () => 'https://pay.google.com' },
      { id: 'upi',  label: 'Send Money', icon: '💸', url: (q) => q ? `upi://pay?pa=${encodeURIComponent(q)}` : 'https://pay.google.com' },
    ]
  },
  {
    id: 'digilocker', name: 'DigiLocker', emoji: '🔐', category: 'India',
    desc: 'Govt documents digital — Aadhaar, DL, PAN',
    tags: ['digilocker','aadhaar','pan','dl','govt','document'],
    baseUrl: 'https://www.digilocker.gov.in',
    india: true,
  },
  {
    id: 'nta', name: 'NTA (NEET)', emoji: '🩺', category: 'India',
    desc: 'NEET admit card, result, registration',
    tags: ['neet','nta','admit card','result','exam'],
    baseUrl: 'https://nta.ac.in',
    india: true,
    actions: [
      { id: 'neet',     label: 'NEET Portal',   icon: '🩺', url: () => 'https://neet.nta.nic.in' },
      { id: 'jee',      label: 'JEE Portal',    icon: '⚙️', url: () => 'https://jeemain.nta.ac.in' },
    ]
  },
  {
    id: 'collegedunia', name: 'CollegeDunia', emoji: '🏛️', category: 'India',
    desc: 'College search — NEET ke baad admission',
    tags: ['college','admission','neet','rank','medical'],
    baseUrl: 'https://collegedunia.com',
    india: true,
    actions: [
      { id: 'neet', label: 'NEET Colleges', icon: '🏥', url: () => 'https://collegedunia.com/news/neet' },
    ]
  },

  // ── COMMUNICATION ───────────────────────────────────────
  {
    id: 'whatsapp', name: 'WhatsApp Web', emoji: '💬', category: 'Communication',
    desc: 'WhatsApp browser mein — messages send karo',
    tags: ['whatsapp','message','chat','send','wa'],
    baseUrl: 'https://web.whatsapp.com',
    actions: [
      { id: 'open',    label: 'Open Web', icon: '💬', url: () => 'https://web.whatsapp.com' },
      { id: 'send',    label: 'Send to Number', icon: '📱', url: (q) => q ? `https://wa.me/${q.replace(/\D/g,'')}` : 'https://web.whatsapp.com' },
    ]
  },
  {
    id: 'telegram', name: 'Telegram Web', emoji: '✈️', category: 'Communication',
    desc: 'Telegram browser mein kholो',
    tags: ['telegram','message','group','channel','bot'],
    baseUrl: 'https://web.telegram.org',
    actions: [
      { id: 'open', label: 'Open Web',    icon: '✈️', url: () => 'https://web.telegram.org' },
      { id: 'link', label: 'Open Channel', icon: '📢', url: (q) => q ? `https://t.me/${q.replace(/^@/,'')}` : 'https://web.telegram.org' },
    ]
  },
  {
    id: 'gmail', name: 'Gmail', emoji: '📧', category: 'Communication',
    desc: 'Email bhejo, inbox check karo',
    tags: ['gmail','email','mail','inbox','compose'],
    baseUrl: 'https://mail.google.com',
    actions: [
      { id: 'compose', label: 'Compose',   icon: '✍️', url: (q) => q ? `https://mail.google.com/mail/?view=cm&su=${encodeURIComponent(q)}` : 'https://mail.google.com/mail/u/0/#compose' },
      { id: 'inbox',   label: 'Inbox',     icon: '📥', url: () => 'https://mail.google.com' },
    ]
  },

  // ── FINANCE ─────────────────────────────────────────────
  {
    id: 'moneycontrol', name: 'Moneycontrol', emoji: '💹', category: 'Finance',
    desc: 'Stocks, mutual funds, news — India best',
    tags: ['stocks','market','nse','bse','mutual fund','invest'],
    baseUrl: 'https://www.moneycontrol.com',
    india: true,
    actions: [
      { id: 'market', label: 'Markets',    icon: '📈', url: () => 'https://www.moneycontrol.com/markets/indian-indices/' },
      { id: 'mf',     label: 'Mutual Funds',icon: '💰',url: () => 'https://www.moneycontrol.com/mutual-funds/nav/' },
    ]
  },
  {
    id: 'zerodha', name: 'Zerodha Kite', emoji: '🪁', category: 'Finance',
    desc: 'Stock trading — India ka best broker',
    tags: ['zerodha','stock','trade','demat','kite'],
    baseUrl: 'https://kite.zerodha.com',
    india: true,
  },
  {
    id: 'groww', name: 'Groww', emoji: '🌱', category: 'Finance',
    desc: 'Mutual funds + stocks invest karo',
    tags: ['groww','invest','mutual fund','sip','stocks'],
    baseUrl: 'https://groww.in',
    india: true,
  },

  // ── TRANSLATE ───────────────────────────────────────────
  {
    id: 'gtranslate', name: 'Google Translate', emoji: '🌐', category: 'Docs',
    desc: '100+ languages — Hindi↔English best',
    tags: ['translate','hindi','english','language','google'],
    baseUrl: 'https://translate.google.com',
    actions: [
      { id: 'hi_en', label: 'Hindi→English', icon: '🌐', url: (q) => q ? `https://translate.google.com/?sl=hi&tl=en&text=${encodeURIComponent(q)}` : 'https://translate.google.com/?sl=hi&tl=en' },
      { id: 'en_hi', label: 'English→Hindi', icon: '🇮🇳', url: (q) => q ? `https://translate.google.com/?sl=en&tl=hi&text=${encodeURIComponent(q)}` : 'https://translate.google.com/?sl=en&tl=hi' },
    ]
  },
]

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

export const CATEGORIES: Category[] = [
  'AI Tools','Design','Code','Docs','Productivity',
  'Media','Images','PDF & Files','Education','India',
  'Communication','Finance',
]

export const CATEGORY_ICONS: Record<Category, string> = {
  'AI Tools':     '🤖',
  'Design':       '🎨',
  'Code':         '💻',
  'Docs':         '📝',
  'Productivity': '⚡',
  'Media':        '🎵',
  'Images':       '📷',
  'PDF & Files':  '📄',
  'Education':    '🎓',
  'India':        '🇮🇳',
  'Communication':'💬',
  'Finance':      '💹',
}

// Smart app search from natural language query
export function findApps(query: string, limit = 8): AppDef[] {
  if (!query.trim()) return APPS.slice(0, 8)
  const q = query.toLowerCase()
  const scored = APPS.map(app => {
    let score = 0
    if (app.name.toLowerCase().includes(q)) score += 6
    if (app.id.includes(q)) score += 4
    if (app.desc.toLowerCase().includes(q)) score += 3
    score += app.tags.filter(t => q.includes(t) || t.includes(q)).length * 2
    // Intent detection
    if (/translate|anuvad/.test(q) && app.id === 'gtranslate') score += 6
    if (/train|ticket|pnr|railway/.test(q) && app.id === 'irctc') score += 6
    if (/graph|plot|function/.test(q) && app.id === 'desmos') score += 6
    if (/math|equation|calculate/.test(q) && ['wolfram','desmos'].includes(app.id)) score += 4
    if (/code|coding|program/.test(q) && app.category === 'Code') score += 3
    if (/image|photo|pic/.test(q) && ['unsplash','pexels','remove_bg','squoosh'].includes(app.id)) score += 4
    if (/neet|jee|study|padh/.test(q) && ['pw','khan','unacademy','nta','desmos'].includes(app.id)) score += 5
    if (/pdf/.test(q) && app.category === 'PDF & Files') score += 5
    if (/design|poster|banner/.test(q) && app.category === 'Design') score += 3
    return { ...app, score }
  })
  return scored.filter(a => a.score > 0).sort((a, b) => b.score - a.score).slice(0, limit)
}

// Get app by id
export function getApp(id: string): AppDef | undefined {
  return APPS.find(a => a.id === id)
}

// Get default action URL for an app
export function getAppUrl(app: AppDef, query?: string): string {
  if (app.actions?.length) return app.actions[0].url(query)
  return app.baseUrl
}

// Open app in new tab
export function openApp(app: AppDef, actionId?: string, query?: string): void {
  const action = actionId ? app.actions?.find(a => a.id === actionId) : app.actions?.[0]
  const url = action ? action.url(query) : app.baseUrl
  if (url.startsWith('upi://')) {
    window.location.href = url
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
