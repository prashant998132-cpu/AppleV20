// lib/integrations/mega.ts — JARVIS Mega App Registry v2
// 150+ apps · 20 categories · Deep links + real API connections
// No-key apps always work · API-key apps unlock extra features

export type MegaCategory =
  | 'AI Tools' | 'Design & Art' | 'Code & Dev' | 'Media & Music'
  | 'Photos & Video' | 'Docs & Notes' | 'Productivity' | 'Communication'
  | 'India' | 'Education' | 'Finance' | 'Cloud & Storage'
  | 'Social Media' | 'Entertainment' | 'Developer Tools' | 'Security & Privacy'
  | 'PDF & Files' | 'Health & Fitness' | 'Shopping' | 'Travel'

export interface MegaAction {
  id: string
  label: string
  icon: string
  url: (q?: string) => string
  tooltip?: string
  apiOnly?: boolean  // requires API key
}

export interface MegaApp {
  id: string
  name: string
  emoji: string
  category: MegaCategory
  desc: string
  baseUrl: string
  hasRealApi?: boolean     // true = JARVIS can make real API calls
  apiKeyId?: string        // Settings key name
  apiKeyFree?: boolean     // free tier available
  noKey: boolean           // works without any API key
  india?: boolean
  actions: MegaAction[]
  tags?: string[]
}

// ══════════════════════════════════════════════════════════════
// MEGA APP REGISTRY — 150+ apps
// ══════════════════════════════════════════════════════════════
export const MEGA_APPS: MegaApp[] = [

  // ──────────────────────────────────────────────────────────
  // 🤖 AI TOOLS (12 apps)
  // ──────────────────────────────────────────────────────────
  { id:'chatgpt', name:'ChatGPT', emoji:'🤖', category:'AI Tools', desc:'OpenAI GPT-4o chat', baseUrl:'https://chat.openai.com', noKey:true, actions:[
    { id:'new', label:'New Chat', icon:'💬', url:(q)=>q?`https://chat.openai.com/?q=${encodeURIComponent(q!)}`:'https://chat.openai.com' },
    { id:'gpt4o', label:'GPT-4o', icon:'⚡', url:(q)=>`https://chat.openai.com/?model=gpt-4o${q?'&q='+encodeURIComponent(q):''}` },
    { id:'dalle', label:'DALL-E 3', icon:'🎨', url:()=>'https://chat.openai.com/?model=gpt-4' },
    { id:'gpts', label:'GPT Store', icon:'🏪', url:(q)=>q?`https://chat.openai.com/gpts/search?q=${encodeURIComponent(q!)}`:'https://chat.openai.com/gpts' },
  ]},
  { id:'gemini', name:'Google Gemini', emoji:'🌟', category:'AI Tools', desc:'Google Gemini Ultra', baseUrl:'https://gemini.google.com', noKey:true, actions:[
    { id:'chat', label:'Open', icon:'🌟', url:(q)=>q?`https://gemini.google.com/app?q=${encodeURIComponent(q!)}`:'https://gemini.google.com' },
    { id:'advanced', label:'Gemini Advanced', icon:'💎', url:()=>'https://gemini.google.com/advanced' },
  ]},
  { id:'claude_ai', name:'Claude (Anthropic)', emoji:'🎭', category:'AI Tools', desc:'Claude 3.5 Sonnet', baseUrl:'https://claude.ai', noKey:true, actions:[
    { id:'new', label:'New Chat', icon:'💬', url:()=>'https://claude.ai/new' },
    { id:'projects', label:'Projects', icon:'📁', url:()=>'https://claude.ai/projects' },
  ]},
  { id:'perplexity', name:'Perplexity AI', emoji:'🔎', category:'AI Tools', desc:'AI search engine', baseUrl:'https://perplexity.ai', noKey:true, actions:[
    { id:'search', label:'Search', icon:'🔍', url:(q)=>q?`https://www.perplexity.ai/search?q=${encodeURIComponent(q!)}`:'https://perplexity.ai' },
    { id:'spaces', label:'Spaces', icon:'📚', url:()=>'https://www.perplexity.ai/spaces' },
  ]},
  { id:'copilot', name:'Microsoft Copilot', emoji:'🪟', category:'AI Tools', desc:'Bing AI + GPT-4', baseUrl:'https://copilot.microsoft.com', noKey:true, actions:[
    { id:'chat', label:'Open', icon:'🪟', url:(q)=>q?`https://copilot.microsoft.com/?q=${encodeURIComponent(q!)}`:'https://copilot.microsoft.com' },
  ]},
  { id:'mistral', name:'Mistral Le Chat', emoji:'🌊', category:'AI Tools', desc:'Mistral AI models', baseUrl:'https://chat.mistral.ai', noKey:true, actions:[
    { id:'chat', label:'Open', icon:'🌊', url:()=>'https://chat.mistral.ai' },
  ]},
  { id:'poe', name:'Poe', emoji:'📡', category:'AI Tools', desc:'Multi-AI platform', baseUrl:'https://poe.com', noKey:true, actions:[
    { id:'chat', label:'Open Poe', icon:'📡', url:(q)=>q?`https://poe.com/search?q=${encodeURIComponent(q!)}`:'https://poe.com' },
    { id:'claude', label:'Claude on Poe', icon:'🎭', url:()=>'https://poe.com/Claude-3.5-Sonnet' },
    { id:'llama', label:'Llama on Poe', icon:'🦙', url:()=>'https://poe.com/Llama-3.1-70b' },
  ]},
  { id:'huggingface', name:'Hugging Face', emoji:'🤗', category:'AI Tools', desc:'AI models & datasets', baseUrl:'https://huggingface.co', noKey:true, actions:[
    { id:'spaces', label:'Spaces', icon:'🚀', url:(q)=>q?`https://huggingface.co/spaces?search=${encodeURIComponent(q!)}`:'https://huggingface.co/spaces' },
    { id:'models', label:'Models', icon:'🧠', url:(q)=>q?`https://huggingface.co/models?search=${encodeURIComponent(q!)}`:'https://huggingface.co/models' },
    { id:'datasets', label:'Datasets', icon:'📊', url:(q)=>q?`https://huggingface.co/datasets?search=${encodeURIComponent(q!)}`:'https://huggingface.co/datasets' },
  ]},
  { id:'groq_console', name:'Groq Console', emoji:'⚡', category:'AI Tools', desc:'World fastest LLM inference', baseUrl:'https://console.groq.com', noKey:true, actions:[
    { id:'playground', label:'Playground', icon:'🎮', url:()=>'https://console.groq.com/playground' },
    { id:'keys', label:'API Keys', icon:'🔑', url:()=>'https://console.groq.com/keys' },
  ]},
  { id:'openrouter', name:'OpenRouter', emoji:'🔀', category:'AI Tools', desc:'100+ AI models, one API', baseUrl:'https://openrouter.ai', noKey:true, actions:[
    { id:'models', label:'Models', icon:'🧠', url:(q)=>q?`https://openrouter.ai/models?q=${encodeURIComponent(q!)}`:'https://openrouter.ai/models' },
    { id:'playground', label:'Playground', icon:'🎮', url:()=>'https://openrouter.ai/playground' },
    { id:'keys', label:'API Keys', icon:'🔑', url:()=>'https://openrouter.ai/settings/keys' },
  ]},
  { id:'replicate', name:'Replicate', emoji:'♾️', category:'AI Tools', desc:'Run AI models in cloud', baseUrl:'https://replicate.com', noKey:true, actions:[
    { id:'explore', label:'Explore', icon:'🔍', url:(q)=>q?`https://replicate.com/explore?query=${encodeURIComponent(q!)}`:'https://replicate.com/explore' },
    { id:'flux', label:'Flux Image', icon:'🎨', url:()=>'https://replicate.com/black-forest-labs/flux-schnell' },
    { id:'whisper', label:'Whisper', icon:'🎤', url:()=>'https://replicate.com/openai/whisper' },
  ]},
  { id:'elevenlabs', name:'ElevenLabs', emoji:'🔊', category:'AI Tools', desc:'AI voice generation', baseUrl:'https://elevenlabs.io', noKey:true, actions:[
    { id:'tts', label:'Text to Speech', icon:'🔊', url:(q)=>q?`https://elevenlabs.io/app/speech-synthesis?text=${encodeURIComponent(q!)}`:'https://elevenlabs.io/app/speech-synthesis' },
    { id:'dubbing', label:'Dubbing', icon:'🎬', url:()=>'https://elevenlabs.io/app/dubbing' },
    { id:'voices', label:'Voice Library', icon:'🎭', url:()=>'https://elevenlabs.io/app/voice-library' },
  ]},

  // ──────────────────────────────────────────────────────────
  // 🎨 DESIGN & ART (12 apps)
  // ──────────────────────────────────────────────────────────
  { id:'canva', name:'Canva', emoji:'🎨', category:'Design & Art', desc:'Graphic design platform', baseUrl:'https://canva.com', noKey:true, actions:[
    { id:'new', label:'New Design', icon:'✨', url:()=>'https://www.canva.com/design/new' },
    { id:'insta', label:'Instagram Post', icon:'📸', url:()=>'https://www.canva.com/create/instagram-posts/' },
    { id:'resume', label:'Resume', icon:'📄', url:()=>'https://www.canva.com/create/resumes/' },
    { id:'poster', label:'Poster', icon:'🖼️', url:()=>'https://www.canva.com/create/posters/' },
    { id:'logo', label:'Logo', icon:'✨', url:()=>'https://www.canva.com/create/logos/' },
    { id:'templates', label:'Templates', icon:'📚', url:(q)=>q?`https://www.canva.com/search/templates?q=${encodeURIComponent(q!)}`:'https://www.canva.com/templates/' },
    { id:'reel', label:'Reel/Story', icon:'🎬', url:()=>'https://www.canva.com/create/instagram-reels/' },
    { id:'thumbnail', label:'YT Thumbnail', icon:'▶️', url:()=>'https://www.canva.com/create/youtube-thumbnails/' },
  ]},
  { id:'figma', name:'Figma', emoji:'🖊️', category:'Design & Art', desc:'UI/UX design tool', baseUrl:'https://figma.com', noKey:true, actions:[
    { id:'new', label:'New File', icon:'✨', url:()=>'https://www.figma.com/design/new' },
    { id:'community', label:'Community', icon:'🌐', url:(q)=>q?`https://www.figma.com/community/search?resource_type=files&query=${encodeURIComponent(q!)}`:'https://www.figma.com/community' },
    { id:'figjam', label:'FigJam Board', icon:'🟡', url:()=>'https://www.figma.com/figjam/new' },
    { id:'proto', label:'Prototype', icon:'📱', url:()=>'https://www.figma.com' },
  ]},
  { id:'excalidraw', name:'Excalidraw', emoji:'✏️', category:'Design & Art', desc:'Virtual whiteboard', baseUrl:'https://excalidraw.com', noKey:true, actions:[
    { id:'new', label:'New Drawing', icon:'✏️', url:()=>'https://excalidraw.com' },
    { id:'plus', label:'Excalidraw+', icon:'⭐', url:()=>'https://plus.excalidraw.com' },
  ]},
  { id:'midjourney', name:'Midjourney', emoji:'🎭', category:'Design & Art', desc:'AI art generation', baseUrl:'https://midjourney.com', noKey:true, actions:[
    { id:'explore', label:'Explore', icon:'🔍', url:(q)=>q?`https://www.midjourney.com/explore?q=${encodeURIComponent(q!)}`:'https://www.midjourney.com/explore' },
    { id:'docs', label:'Docs', icon:'📖', url:()=>'https://docs.midjourney.com' },
  ]},
  { id:'adobe_express', name:'Adobe Express', emoji:'🔴', category:'Design & Art', desc:'Quick Adobe designs', baseUrl:'https://express.adobe.com', noKey:true, actions:[
    { id:'new', label:'New Design', icon:'✨', url:()=>'https://new.express.adobe.com' },
    { id:'logo', label:'Logo', icon:'✨', url:()=>'https://new.express.adobe.com/tools/logo-maker' },
    { id:'remove_bg', label:'Remove BG', icon:'🪄', url:()=>'https://new.express.adobe.com/tools/remove-background' },
    { id:'resize', label:'Resize', icon:'📐', url:()=>'https://new.express.adobe.com/tools/image-resizer' },
  ]},
  { id:'remove_bg', name:'Remove.bg', emoji:'🪄', category:'Design & Art', desc:'Remove image background', baseUrl:'https://remove.bg', noKey:true, actions:[
    { id:'upload', label:'Remove BG', icon:'🪄', url:()=>'https://www.remove.bg/upload' },
    { id:'api', label:'API Docs', icon:'📖', url:()=>'https://www.remove.bg/api' },
  ]},
  { id:'leonardo', name:'Leonardo AI', emoji:'🦁', category:'Design & Art', desc:'AI image generation', baseUrl:'https://leonardo.ai', noKey:true, actions:[
    { id:'generate', label:'Generate', icon:'🎨', url:(q)=>q?`https://app.leonardo.ai/image-generation?prompt=${encodeURIComponent(q!)}`:'https://app.leonardo.ai' },
    { id:'realtime', label:'Realtime Canvas', icon:'⚡', url:()=>'https://app.leonardo.ai/realtime-canvas' },
  ]},
  { id:'ideogram', name:'Ideogram', emoji:'🖼️', category:'Design & Art', desc:'AI art with text', baseUrl:'https://ideogram.ai', noKey:true, actions:[
    { id:'generate', label:'Generate', icon:'🎨', url:(q)=>q?`https://ideogram.ai/?prompt=${encodeURIComponent(q!)}`:'https://ideogram.ai' },
  ]},
  { id:'stable_diffusion', name:'Stable Diffusion (Web)', emoji:'🌊', category:'Design & Art', desc:'Open source AI art online', baseUrl:'https://stablediffusionweb.com', noKey:true, actions:[
    { id:'generate', label:'Generate', icon:'🎨', url:(q)=>q?`https://stablediffusionweb.com/?prompt=${encodeURIComponent(q!)}`:'https://stablediffusionweb.com' },
  ]},
  { id:'freepik', name:'Freepik', emoji:'🌈', category:'Design & Art', desc:'Free vectors, PSDs, icons', baseUrl:'https://freepik.com', noKey:true, actions:[
    { id:'search', label:'Search', icon:'🔍', url:(q)=>q?`https://www.freepik.com/search?query=${encodeURIComponent(q!)}`:'https://www.freepik.com' },
    { id:'vectors', label:'Vectors', icon:'📐', url:(q)=>q?`https://www.freepik.com/vectors?query=${encodeURIComponent(q!)}`:'https://www.freepik.com/vectors' },
    { id:'ai_img', label:'AI Image Gen', icon:'✨', url:(q)=>q?`https://www.freepik.com/pikaso/ai-image-generator?prompt=${encodeURIComponent(q!)}`:'https://www.freepik.com/pikaso/ai-image-generator' },
  ]},
  { id:'flaticon', name:'Flaticon', emoji:'⭐', category:'Design & Art', desc:'Free icons library', baseUrl:'https://flaticon.com', noKey:true, actions:[
    { id:'search', label:'Search Icons', icon:'🔍', url:(q)=>q?`https://www.flaticon.com/search?word=${encodeURIComponent(q!)}`:'https://www.flaticon.com' },
  ]},
  { id:'coolors', name:'Coolors', emoji:'🎨', category:'Design & Art', desc:'Color palette generator', baseUrl:'https://coolors.co', noKey:true, actions:[
    { id:'generate', label:'Generate Palette', icon:'🎨', url:()=>'https://coolors.co/generate' },
    { id:'explore', label:'Explore', icon:'🔍', url:()=>'https://coolors.co/palettes/trending' },
    { id:'picker', label:'Color Picker', icon:'🎯', url:()=>'https://coolors.co/color-picker' },
  ]},

  // ──────────────────────────────────────────────────────────
  // 💻 CODE & DEV (15 apps)
  // ──────────────────────────────────────────────────────────
  { id:'github', name:'GitHub', emoji:'🐙', category:'Code & Dev', desc:'Code hosting + version control', baseUrl:'https://github.com', hasRealApi:true, apiKeyId:'GITHUB_TOKEN', apiKeyFree:true, noKey:true, actions:[
    { id:'new_repo', label:'New Repo', icon:'📦', url:()=>'https://github.com/new' },
    { id:'gist', label:'New Gist', icon:'📋', url:()=>'https://gist.github.com' },
    { id:'codespace', label:'Codespace', icon:'☁️', url:()=>'https://github.com/codespaces/new' },
    { id:'search', label:'Search Code', icon:'🔍', url:(q)=>q?`https://github.com/search?q=${encodeURIComponent(q!)}&type=code`:'https://github.com/explore' },
    { id:'explore', label:'Explore', icon:'🌐', url:()=>'https://github.com/explore' },
    { id:'trending', label:'Trending', icon:'🔥', url:()=>'https://github.com/trending' },
    { id:'actions', label:'Actions', icon:'⚙️', url:()=>'https://github.com/features/actions' },
    { id:'copilot', label:'Copilot', icon:'🤖', url:()=>'https://github.com/features/copilot' },
  ], tags:['git','version control','open source']},
  { id:'vscode_web', name:'VS Code (Web)', emoji:'💙', category:'Code & Dev', desc:'VS Code in browser', baseUrl:'https://vscode.dev', noKey:true, actions:[
    { id:'open', label:'Open Editor', icon:'💙', url:()=>'https://vscode.dev' },
    { id:'github_dev', label:'GitHub.dev', icon:'🐙', url:(q)=>q?`https://github.dev/${q}`:'https://github.dev' },
    { id:'new_file', label:'New File', icon:'📄', url:()=>'https://vscode.dev' },
  ]},
  { id:'replit', name:'Replit', emoji:'🔄', category:'Code & Dev', desc:'Cloud IDE, instant deploy', baseUrl:'https://replit.com', noKey:true, actions:[
    { id:'new', label:'New Repl', icon:'✨', url:()=>'https://replit.com/new' },
    { id:'python', label:'Python', icon:'🐍', url:()=>'https://replit.com/new/python3' },
    { id:'nodejs', label:'Node.js', icon:'🟢', url:()=>'https://replit.com/new/nodejs' },
    { id:'react', label:'React', icon:'⚛️', url:()=>'https://replit.com/new/reactts' },
    { id:'flask', label:'Flask', icon:'🌶️', url:()=>'https://replit.com/new/flask' },
  ]},
  { id:'codepen', name:'CodePen', emoji:'🖊️', category:'Code & Dev', desc:'HTML/CSS/JS playground', baseUrl:'https://codepen.io', noKey:true, actions:[
    { id:'new', label:'New Pen', icon:'✨', url:()=>'https://codepen.io/pen/' },
    { id:'explore', label:'Explore', icon:'🔍', url:(q)=>q?`https://codepen.io/search/pens?q=${encodeURIComponent(q!)}`:'https://codepen.io/explore' },
  ]},
  { id:'stackblitz', name:'StackBlitz', emoji:'⚡', category:'Code & Dev', desc:'Instant cloud IDE', baseUrl:'https://stackblitz.com', noKey:true, actions:[
    { id:'react', label:'React', icon:'⚛️', url:()=>'https://stackblitz.com/fork/react' },
    { id:'nextjs', label:'Next.js', icon:'▲', url:()=>'https://stackblitz.com/fork/nextjs' },
    { id:'vue', label:'Vue', icon:'💚', url:()=>'https://stackblitz.com/fork/vue' },
    { id:'node', label:'Node.js', icon:'🟢', url:()=>'https://stackblitz.com/fork/node' },
    { id:'astro', label:'Astro', icon:'🚀', url:()=>'https://stackblitz.com/fork/astro' },
  ]},
  { id:'colab', name:'Google Colab', emoji:'📓', category:'Code & Dev', desc:'Jupyter notebooks in cloud', baseUrl:'https://colab.research.google.com', noKey:true, actions:[
    { id:'new', label:'New Notebook', icon:'📓', url:()=>'https://colab.research.google.com/#create=true' },
    { id:'search', label:'Search', icon:'🔍', url:(q)=>q?`https://colab.research.google.com/search#q=${encodeURIComponent(q!)}`:'https://colab.research.google.com' },
    { id:'kaggle', label:'Kaggle Datasets', icon:'📊', url:()=>'https://www.kaggle.com/datasets' },
  ]},
  { id:'jsfiddle', name:'JSFiddle', emoji:'🎻', category:'Code & Dev', desc:'JS/HTML/CSS online', baseUrl:'https://jsfiddle.net', noKey:true, actions:[
    { id:'new', label:'New Fiddle', icon:'✨', url:()=>'https://jsfiddle.net' },
    { id:'echo', label:'Echo Test', icon:'🔊', url:()=>'https://jsfiddle.net/echo/html/' },
  ]},
  { id:'vercel', name:'Vercel', emoji:'▲', category:'Code & Dev', desc:'Deploy frontend apps', baseUrl:'https://vercel.com', noKey:true, actions:[
    { id:'new', label:'New Project', icon:'✨', url:()=>'https://vercel.com/new' },
    { id:'dashboard', label:'Dashboard', icon:'📊', url:()=>'https://vercel.com/dashboard' },
    { id:'templates', label:'Templates', icon:'📚', url:(q)=>q?`https://vercel.com/templates?search=${encodeURIComponent(q!)}`:'https://vercel.com/templates' },
    { id:'docs', label:'Docs', icon:'📖', url:()=>'https://vercel.com/docs' },
  ]},
  { id:'netlify', name:'Netlify', emoji:'💚', category:'Code & Dev', desc:'Deploy & host websites', baseUrl:'https://netlify.com', noKey:true, actions:[
    { id:'new', label:'New Site', icon:'✨', url:()=>'https://app.netlify.com/start' },
    { id:'dashboard', label:'Dashboard', icon:'📊', url:()=>'https://app.netlify.com' },
    { id:'drop', label:'Drop Zone', icon:'📦', url:()=>'https://app.netlify.com/drop' },
  ]},
  { id:'npm', name:'npm', emoji:'📦', category:'Code & Dev', desc:'JavaScript package registry', baseUrl:'https://npmjs.com', hasRealApi:true, noKey:true, actions:[
    { id:'search', label:'Search Packages', icon:'🔍', url:(q)=>q?`https://www.npmjs.com/search?q=${encodeURIComponent(q!)}`:'https://www.npmjs.com' },
    { id:'trending', label:'Popular', icon:'🔥', url:()=>'https://www.npmjs.com/search?ranking=popularity' },
  ]},
  { id:'pypi', name:'PyPI', emoji:'🐍', category:'Code & Dev', desc:'Python package index', baseUrl:'https://pypi.org', hasRealApi:true, noKey:true, actions:[
    { id:'search', label:'Search Packages', icon:'🔍', url:(q)=>q?`https://pypi.org/search/?q=${encodeURIComponent(q!)}`:'https://pypi.org' },
  ]},
  { id:'devdocs', name:'DevDocs', emoji:'📚', category:'Code & Dev', desc:'API documentation browser', baseUrl:'https://devdocs.io', noKey:true, actions:[
    { id:'search', label:'Search Docs', icon:'🔍', url:(q)=>q?`https://devdocs.io/#q=${encodeURIComponent(q!)}`:'https://devdocs.io' },
    { id:'react', label:'React Docs', icon:'⚛️', url:()=>'https://devdocs.io/react/' },
    { id:'python', label:'Python Docs', icon:'🐍', url:()=>'https://devdocs.io/python~3.12/' },
    { id:'mdn', label:'MDN Web', icon:'🌐', url:()=>'https://devdocs.io/css/' },
  ]},
  { id:'regex101', name:'Regex101', emoji:'🔤', category:'Code & Dev', desc:'Online regex tester', baseUrl:'https://regex101.com', noKey:true, actions:[
    { id:'test', label:'Test Regex', icon:'🔤', url:(q)=>q?`https://regex101.com/?regex=${encodeURIComponent(q!)}`:'https://regex101.com' },
  ]},
  { id:'codebeautify', name:'CodeBeautify', emoji:'💅', category:'Code & Dev', desc:'Format/validate code online', baseUrl:'https://codebeautify.org', noKey:true, actions:[
    { id:'json', label:'JSON Format', icon:'📋', url:()=>'https://codebeautify.org/jsonviewer' },
    { id:'html', label:'HTML Format', icon:'🌐', url:()=>'https://codebeautify.org/htmlviewer' },
    { id:'css', label:'CSS Format', icon:'🎨', url:()=>'https://codebeautify.org/css-beautify-minify' },
    { id:'sql', label:'SQL Format', icon:'🗄️', url:()=>'https://codebeautify.org/sqlformatter' },
  ]},
  { id:'ray_so', name:'Ray.so', emoji:'🌅', category:'Code & Dev', desc:'Beautiful code screenshots', baseUrl:'https://ray.so', noKey:true, actions:[
    { id:'create', label:'Code Screenshot', icon:'📸', url:(q)=>q?`https://ray.so/?code=${encodeURIComponent(q!)}`:'https://ray.so' },
  ]},

  // ──────────────────────────────────────────────────────────
  // 🎵 MEDIA & MUSIC (12 apps)
  // ──────────────────────────────────────────────────────────
  { id:'youtube', name:'YouTube', emoji:'▶️', category:'Media & Music', desc:'Videos, music, tutorials', baseUrl:'https://youtube.com', hasRealApi:true, apiKeyId:'YOUTUBE_API_KEY', apiKeyFree:true, noKey:true, actions:[
    { id:'search', label:'Search', icon:'🔍', url:(q)=>q?`https://www.youtube.com/results?search_query=${encodeURIComponent(q!)}`:'https://youtube.com' },
    { id:'trending', label:'Trending', icon:'🔥', url:()=>'https://www.youtube.com/feed/trending' },
    { id:'upload', label:'Upload', icon:'⬆️', url:()=>'https://studio.youtube.com' },
    { id:'music', label:'YT Music', icon:'🎵', url:(q)=>q?`https://music.youtube.com/search?q=${encodeURIComponent(q!)}`:'https://music.youtube.com' },
    { id:'shorts', label:'Shorts', icon:'📱', url:()=>'https://www.youtube.com/shorts' },
    { id:'studio', label:'Studio', icon:'🎬', url:()=>'https://studio.youtube.com' },
  ]},
  { id:'spotify', name:'Spotify', emoji:'🎵', category:'Media & Music', desc:'Music streaming', baseUrl:'https://open.spotify.com', hasRealApi:true, apiKeyId:'SPOTIFY_CLIENT_ID', apiKeyFree:true, noKey:true, actions:[
    { id:'search', label:'Search', icon:'🔍', url:(q)=>q?`https://open.spotify.com/search/${encodeURIComponent(q!)}`:'https://open.spotify.com' },
    { id:'new_releases', label:'New Releases', icon:'🆕', url:()=>'https://open.spotify.com/genre/new-releases-page' },
    { id:'charts', label:'Charts', icon:'📊', url:()=>'https://charts.spotify.com/charts/overview/global' },
    { id:'podcast', label:'Podcasts', icon:'🎙️', url:(q)=>q?`https://open.spotify.com/search/${encodeURIComponent(q!)}/podcasts`:'https://open.spotify.com/genre/podcasts-web' },
  ]},
  { id:'soundcloud', name:'SoundCloud', emoji:'☁️', category:'Media & Music', desc:'Independent music platform', baseUrl:'https://soundcloud.com', noKey:true, actions:[
    { id:'search', label:'Search', icon:'🔍', url:(q)=>q?`https://soundcloud.com/search?q=${encodeURIComponent(q!)}`:'https://soundcloud.com' },
    { id:'charts', label:'Charts', icon:'📊', url:()=>'https://soundcloud.com/charts/top' },
    { id:'upload', label:'Upload', icon:'⬆️', url:()=>'https://soundcloud.com/upload' },
  ]},
  { id:'deezer', name:'Deezer', emoji:'🎶', category:'Media & Music', desc:'Music streaming + free API', baseUrl:'https://deezer.com', hasRealApi:true, apiKeyFree:true, noKey:true, actions:[
    { id:'search', label:'Search', icon:'🔍', url:(q)=>q?`https://www.deezer.com/search/${encodeURIComponent(q!)}`:'https://www.deezer.com' },
    { id:'charts', label:'Charts', icon:'📊', url:()=>'https://www.deezer.com/en/channels/charts' },
    { id:'radio', label:'Radio', icon:'📻', url:()=>'https://www.deezer.com/en/channels/radios' },
  ]},
  { id:'jamendo', name:'Jamendo', emoji:'🎸', category:'Media & Music', desc:'Free Creative Commons music', baseUrl:'https://jamendo.com', hasRealApi:true, apiKeyId:'JAMENDO_CLIENT_ID', apiKeyFree:true, noKey:true, actions:[
    { id:'search', label:'Search', icon:'🔍', url:(q)=>q?`https://www.jamendo.com/search?q=${encodeURIComponent(q!)}`:'https://www.jamendo.com' },
    { id:'free', label:'Free Downloads', icon:'💚', url:()=>'https://www.jamendo.com/start' },
    { id:'radio', label:'Radio', icon:'📻', url:()=>'https://www.jamendo.com/radios' },
  ]},
  { id:'audiomack', name:'Audiomack', emoji:'🎤', category:'Media & Music', desc:'Free music streaming', baseUrl:'https://audiomack.com', noKey:true, actions:[
    { id:'search', label:'Search', icon:'🔍', url:(q)=>q?`https://audiomack.com/search?q=${encodeURIComponent(q!)}`:'https://audiomack.com' },
    { id:'trending', label:'Trending', icon:'🔥', url:()=>'https://audiomack.com/trending' },
    { id:'upload', label:'Upload', icon:'⬆️', url:()=>'https://audiomack.com/upload' },
  ]},
  { id:'mixcloud', name:'Mixcloud', emoji:'🎛️', category:'Media & Music', desc:'DJ mixes & radio shows', baseUrl:'https://mixcloud.com', noKey:true, actions:[
    { id:'search', label:'Search Mixes', icon:'🔍', url:(q)=>q?`https://www.mixcloud.com/search/?q=${encodeURIComponent(q!)}`:'https://www.mixcloud.com' },
    { id:'discover', label:'Discover', icon:'🌐', url:()=>'https://www.mixcloud.com/discover/' },
  ]},
  { id:'musicbrainz', name:'MusicBrainz', emoji:'🎼', category:'Media & Music', desc:'Open music encyclopedia', baseUrl:'https://musicbrainz.org', hasRealApi:true, noKey:true, actions:[
    { id:'search', label:'Search', icon:'🔍', url:(q)=>q?`https://musicbrainz.org/search?query=${encodeURIComponent(q!)}&type=artist`:'https://musicbrainz.org' },
    { id:'artist', label:'Artist Info', icon:'🎤', url:(q)=>q?`https://musicbrainz.org/search?query=${encodeURIComponent(q!)}&type=artist`:'https://musicbrainz.org' },
  ]},
  { id:'lastfm', name:'Last.fm', emoji:'📻', category:'Media & Music', desc:'Music tracking & discovery', baseUrl:'https://last.fm', hasRealApi:true, apiKeyId:'LASTFM_API_KEY', apiKeyFree:true, noKey:true, actions:[
    { id:'search', label:'Search', icon:'🔍', url:(q)=>q?`https://www.last.fm/search?q=${encodeURIComponent(q!)}`:'https://www.last.fm' },
    { id:'charts', label:'Top Charts', icon:'📊', url:()=>'https://www.last.fm/charts' },
    { id:'similar', label:'Similar Artists', icon:'🔀', url:(q)=>q?`https://www.last.fm/music/${encodeURIComponent(q!)}/+similar`:'https://www.last.fm' },
  ]},
  { id:'genius', name:'Genius', emoji:'💡', category:'Media & Music', desc:'Song lyrics & annotations', baseUrl:'https://genius.com', noKey:true, actions:[
    { id:'search', label:'Search Lyrics', icon:'🔍', url:(q)=>q?`https://genius.com/search?q=${encodeURIComponent(q!)}`:'https://genius.com' },
  ]},
  { id:'shazam', name:'Shazam', emoji:'🎵', category:'Media & Music', desc:'Music identification', baseUrl:'https://shazam.com', noKey:true, actions:[
    { id:'search', label:'Search', icon:'🔍', url:(q)=>q?`https://www.shazam.com/search?term=${encodeURIComponent(q!)}`:'https://www.shazam.com' },
    { id:'charts', label:'Charts', icon:'📊', url:()=>'https://www.shazam.com/charts/top-200/india' },
    { id:'in_charts', label:'India Charts', icon:'🇮🇳', url:()=>'https://www.shazam.com/charts/top-200/india' },
  ]},
  { id:'freesound', name:'FreeSound', emoji:'🔉', category:'Media & Music', desc:'Free sound effects library', baseUrl:'https://freesound.org', hasRealApi:true, apiKeyId:'FREESOUND_API_KEY', apiKeyFree:true, noKey:true, actions:[
    { id:'search', label:'Search Sounds', icon:'🔍', url:(q)=>q?`https://freesound.org/search/?q=${encodeURIComponent(q!)}`:'https://freesound.org' },
    { id:'random', label:'Random Sound', icon:'🎲', url:()=>'https://freesound.org/browse/random/' },
  ]},

  // ──────────────────────────────────────────────────────────
  // 📷 PHOTOS & VIDEO (10 apps)
  // ──────────────────────────────────────────────────────────
  { id:'unsplash', name:'Unsplash', emoji:'📷', category:'Photos & Video', desc:'Free hi-res photos', baseUrl:'https://unsplash.com', hasRealApi:true, apiKeyId:'UNSPLASH_ACCESS_KEY', apiKeyFree:true, noKey:true, actions:[
    { id:'search', label:'Search Photos', icon:'🔍', url:(q)=>q?`https://unsplash.com/s/photos/${encodeURIComponent(q!)}`:'https://unsplash.com' },
    { id:'random', label:'Random', icon:'🎲', url:()=>'https://unsplash.com/random' },
    { id:'collections', label:'Collections', icon:'📁', url:()=>'https://unsplash.com/collections' },
    { id:'editorial', label:'Editorial', icon:'📰', url:()=>'https://unsplash.com/editorial' },
  ]},
  { id:'pexels', name:'Pexels', emoji:'🌄', category:'Photos & Video', desc:'Free photos & videos', baseUrl:'https://pexels.com', hasRealApi:true, apiKeyId:'PEXELS_API_KEY', apiKeyFree:true, noKey:true, actions:[
    { id:'photos', label:'Search Photos', icon:'📷', url:(q)=>q?`https://www.pexels.com/search/${encodeURIComponent(q!)}/`:'https://www.pexels.com' },
    { id:'videos', label:'Search Videos', icon:'🎬', url:(q)=>q?`https://www.pexels.com/search/videos/${encodeURIComponent(q!)}/`:'https://www.pexels.com/videos' },
    { id:'trending', label:'Trending', icon:'🔥', url:()=>'https://www.pexels.com/trending-searches' },
  ]},
  { id:'pixabay', name:'Pixabay', emoji:'🖼️', category:'Photos & Video', desc:'Free photos, videos, vectors', baseUrl:'https://pixabay.com', hasRealApi:true, apiKeyId:'PIXABAY_API_KEY', apiKeyFree:true, noKey:true, actions:[
    { id:'photos', label:'Search Photos', icon:'📷', url:(q)=>q?`https://pixabay.com/images/search/${encodeURIComponent(q!)}/`:'https://pixabay.com' },
    { id:'videos', label:'Search Videos', icon:'🎬', url:(q)=>q?`https://pixabay.com/videos/search/${encodeURIComponent(q!)}/`:'https://pixabay.com/videos' },
    { id:'vectors', label:'Vectors', icon:'📐', url:(q)=>q?`https://pixabay.com/vectors/search/${encodeURIComponent(q!)}/`:'https://pixabay.com/vectors' },
  ]},
  { id:'giphy', name:'GIPHY', emoji:'🎭', category:'Photos & Video', desc:'Animated GIFs library', baseUrl:'https://giphy.com', hasRealApi:true, apiKeyId:'GIPHY_API_KEY', apiKeyFree:true, noKey:true, actions:[
    { id:'search', label:'Search GIFs', icon:'🔍', url:(q)=>q?`https://giphy.com/search/${encodeURIComponent(q!)}`:'https://giphy.com' },
    { id:'trending', label:'Trending', icon:'🔥', url:()=>'https://giphy.com/trending-gifs' },
    { id:'stickers', label:'Stickers', icon:'🎨', url:(q)=>q?`https://giphy.com/stickers/${encodeURIComponent(q!)}`:'https://giphy.com/stickers' },
  ]},
  { id:'tenor', name:'Tenor (Google)', emoji:'🎞️', category:'Photos & Video', desc:'GIF search by Google', baseUrl:'https://tenor.com', noKey:true, actions:[
    { id:'search', label:'Search GIFs', icon:'🔍', url:(q)=>q?`https://tenor.com/search/${encodeURIComponent(q!)}-gifs`:'https://tenor.com' },
    { id:'trending', label:'Trending', icon:'🔥', url:()=>'https://tenor.com' },
  ]},
  { id:'imgur', name:'Imgur', emoji:'🖼️', category:'Photos & Video', desc:'Image hosting & sharing', baseUrl:'https://imgur.com', noKey:true, actions:[
    { id:'upload', label:'Upload Image', icon:'⬆️', url:()=>'https://imgur.com/upload' },
    { id:'gallery', label:'Gallery', icon:'🖼️', url:()=>'https://imgur.com/gallery' },
    { id:'meme', label:'Meme Generator', icon:'😂', url:()=>'https://imgur.com/memegen' },
  ]},
  { id:'cloudinary', name:'Cloudinary', emoji:'☁️', category:'Photos & Video', desc:'Media cloud CDN', baseUrl:'https://cloudinary.com', noKey:true, actions:[
    { id:'console', label:'Console', icon:'📊', url:()=>'https://console.cloudinary.com' },
    { id:'demo', label:'Demo Tools', icon:'🔧', url:()=>'https://demo.cloudinary.com' },
    { id:'playground', label:'Playground', icon:'🎮', url:()=>'https://www.cloudinary.com/tools' },
  ]},
  { id:'squoosh', name:'Squoosh', emoji:'🗜️', category:'Photos & Video', desc:'Image compression tool', baseUrl:'https://squoosh.app', noKey:true, actions:[
    { id:'compress', label:'Compress Image', icon:'🗜️', url:()=>'https://squoosh.app' },
  ]},
  { id:'tinypng', name:'TinyPNG', emoji:'🐼', category:'Photos & Video', desc:'Compress PNG/WebP', baseUrl:'https://tinypng.com', noKey:true, actions:[
    { id:'compress', label:'Compress', icon:'🗜️', url:()=>'https://tinypng.com' },
    { id:'api', label:'API', icon:'🔑', url:()=>'https://tinypng.com/developers' },
  ]},
  { id:'coverr', name:'Coverr', emoji:'🎥', category:'Photos & Video', desc:'Free stock video footage', baseUrl:'https://coverr.co', noKey:true, actions:[
    { id:'search', label:'Search Videos', icon:'🔍', url:(q)=>q?`https://coverr.co/search?q=${encodeURIComponent(q!)}`:'https://coverr.co' },
  ]},

  // ──────────────────────────────────────────────────────────
  // 📝 DOCS & NOTES (10 apps)
  // ──────────────────────────────────────────────────────────
  { id:'gdocs', name:'Google Docs', emoji:'📝', category:'Docs & Notes', desc:'Online word processor', baseUrl:'https://docs.google.com', noKey:true, actions:[
    { id:'new', label:'New Doc', icon:'📝', url:()=>'https://docs.new' },
    { id:'recent', label:'Recent', icon:'🕐', url:()=>'https://docs.google.com' },
  ]},
  { id:'gsheets', name:'Google Sheets', emoji:'📊', category:'Docs & Notes', desc:'Online spreadsheet', baseUrl:'https://sheets.google.com', noKey:true, actions:[
    { id:'new', label:'New Sheet', icon:'📊', url:()=>'https://sheets.new' },
  ]},
  { id:'gslides', name:'Google Slides', emoji:'📽️', category:'Docs & Notes', desc:'Online presentations', baseUrl:'https://slides.google.com', noKey:true, actions:[
    { id:'new', label:'New Presentation', icon:'📽️', url:()=>'https://slides.new' },
  ]},
  { id:'notion', name:'Notion', emoji:'🔲', category:'Docs & Notes', desc:'All-in-one workspace', baseUrl:'https://notion.so', hasRealApi:true, apiKeyId:'NOTION_API_KEY', apiKeyFree:true, noKey:true, actions:[
    { id:'new', label:'New Page', icon:'📄', url:()=>'https://notion.so/new' },
    { id:'home', label:'Home', icon:'🏠', url:()=>'https://www.notion.so' },
    { id:'templates', label:'Templates', icon:'📚', url:(q)=>q?`https://www.notion.so/templates?search=${encodeURIComponent(q!)}`:'https://www.notion.so/templates' },
  ]},
  { id:'obsidian', name:'Obsidian (Web)', emoji:'💎', category:'Docs & Notes', desc:'Knowledge base tool', baseUrl:'https://obsidian.md', noKey:true, actions:[
    { id:'publish', label:'Obsidian Publish', icon:'🌐', url:()=>'https://publish.obsidian.md' },
    { id:'docs', label:'Help Docs', icon:'📖', url:()=>'https://help.obsidian.md' },
    { id:'plugins', label:'Plugins', icon:'🔌', url:()=>'https://obsidian.md/plugins' },
  ]},
  { id:'pastebin', name:'Pastebin', emoji:'📋', category:'Docs & Notes', desc:'Share code snippets', baseUrl:'https://pastebin.com', noKey:true, actions:[
    { id:'new', label:'New Paste', icon:'📋', url:()=>'https://pastebin.com' },
    { id:'archive', label:'Public Archive', icon:'📚', url:()=>'https://pastebin.com/archive' },
  ]},
  { id:'hackmd', name:'HackMD', emoji:'📝', category:'Docs & Notes', desc:'Collaborative Markdown notes', baseUrl:'https://hackmd.io', noKey:true, actions:[
    { id:'new', label:'New Note', icon:'📝', url:()=>'https://hackmd.io/new' },
    { id:'team', label:'Teams', icon:'👥', url:()=>'https://hackmd.io/team/new' },
  ]},
  { id:'typefully', name:'Typefully', emoji:'✍️', category:'Docs & Notes', desc:'Twitter/X thread writer', baseUrl:'https://typefully.com', noKey:true, actions:[
    { id:'write', label:'Write Thread', icon:'✍️', url:()=>'https://typefully.com' },
  ]},
  { id:'overleaf', name:'Overleaf', emoji:'🍃', category:'Docs & Notes', desc:'Online LaTeX editor', baseUrl:'https://overleaf.com', noKey:true, actions:[
    { id:'new', label:'New Project', icon:'📄', url:()=>'https://www.overleaf.com/project/new/blank' },
    { id:'templates', label:'Templates', icon:'📚', url:()=>'https://www.overleaf.com/latex/templates' },
  ]},
  { id:'gtranslate', name:'Google Translate', emoji:'🌐', category:'Docs & Notes', desc:'Translate 100+ languages', baseUrl:'https://translate.google.com', noKey:true, actions:[
    { id:'translate', label:'Translate', icon:'🌐', url:(q)=>q?`https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(q!)}`:'https://translate.google.com' },
    { id:'to_hindi', label:'→ Hindi', icon:'🇮🇳', url:(q)=>q?`https://translate.google.com/?sl=auto&tl=hi&text=${encodeURIComponent(q!)}`:'https://translate.google.com/?tl=hi' },
    { id:'to_english', label:'→ English', icon:'🇬🇧', url:(q)=>q?`https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(q!)}`:'https://translate.google.com/?tl=en' },
  ]},

  // ──────────────────────────────────────────────────────────
  // ⚡ PRODUCTIVITY (10 apps)
  // ──────────────────────────────────────────────────────────
  { id:'gcal', name:'Google Calendar', emoji:'📅', category:'Productivity', desc:'Schedule & events', baseUrl:'https://calendar.google.com', noKey:true, actions:[
    { id:'new', label:'New Event', icon:'📅', url:()=>'https://calendar.google.com/calendar/r/eventedit' },
    { id:'today', label:'Today', icon:'📆', url:()=>'https://calendar.google.com/calendar/r/day' },
    { id:'week', label:'This Week', icon:'📅', url:()=>'https://calendar.google.com/calendar/r/week' },
  ]},
  { id:'trello', name:'Trello', emoji:'📌', category:'Productivity', desc:'Kanban project boards', baseUrl:'https://trello.com', hasRealApi:true, apiKeyId:'TRELLO_API_KEY', apiKeyFree:true, noKey:true, actions:[
    { id:'new', label:'New Board', icon:'📌', url:()=>'https://trello.com/create-board' },
    { id:'home', label:'Home', icon:'🏠', url:()=>'https://trello.com' },
    { id:'templates', label:'Templates', icon:'📚', url:(q)=>q?`https://trello.com/templates/search?q=${encodeURIComponent(q!)}`:'https://trello.com/templates' },
  ]},
  { id:'todoist', name:'Todoist', emoji:'✅', category:'Productivity', desc:'Task manager', baseUrl:'https://todoist.com', hasRealApi:true, apiKeyId:'TODOIST_API_TOKEN', apiKeyFree:true, noKey:true, actions:[
    { id:'add', label:'Add Task', icon:'➕', url:(q)=>q?`https://todoist.com/app/inbox?task_content=${encodeURIComponent(q!)}`:'https://todoist.com/app/inbox' },
    { id:'today', label:'Today', icon:'📆', url:()=>'https://todoist.com/app/today' },
    { id:'upcoming', label:'Upcoming', icon:'📅', url:()=>'https://todoist.com/app/upcoming' },
  ]},
  { id:'miro', name:'Miro', emoji:'🟡', category:'Productivity', desc:'Online whiteboard & brainstorm', baseUrl:'https://miro.com', noKey:true, actions:[
    { id:'new', label:'New Board', icon:'🟡', url:()=>'https://miro.com/app/board/new' },
    { id:'templates', label:'Templates', icon:'📚', url:(q)=>q?`https://miro.com/templates/?q=${encodeURIComponent(q!)}`:'https://miro.com/templates' },
  ]},
  { id:'airtable', name:'Airtable', emoji:'🗃️', category:'Productivity', desc:'Spreadsheet + database', baseUrl:'https://airtable.com', hasRealApi:true, apiKeyId:'AIRTABLE_API_KEY', apiKeyFree:true, noKey:true, actions:[
    { id:'new', label:'New Base', icon:'➕', url:()=>'https://airtable.com/create' },
    { id:'templates', label:'Templates', icon:'📚', url:(q)=>q?`https://www.airtable.com/templates/search?q=${encodeURIComponent(q!)}`:'https://www.airtable.com/templates' },
  ]},
  { id:'loom', name:'Loom', emoji:'🎥', category:'Productivity', desc:'Screen + video recorder', baseUrl:'https://loom.com', noKey:true, actions:[
    { id:'record', label:'Record', icon:'🔴', url:()=>'https://www.loom.com/record' },
    { id:'videos', label:'My Videos', icon:'🎥', url:()=>'https://www.loom.com/my-videos' },
  ]},
  { id:'zapier', name:'Zapier', emoji:'⚡', category:'Productivity', desc:'Workflow automation', baseUrl:'https://zapier.com', noKey:true, actions:[
    { id:'new', label:'Create Zap', icon:'⚡', url:()=>'https://zapier.com/app/zaps/new' },
    { id:'explore', label:'Explore', icon:'🔍', url:()=>'https://zapier.com/explore' },
  ]},
  { id:'n8n', name:'n8n (Self-hosted)', emoji:'🔄', category:'Productivity', desc:'Open-source automation', baseUrl:'https://n8n.io', noKey:true, actions:[
    { id:'cloud', label:'n8n Cloud', icon:'☁️', url:()=>'https://app.n8n.cloud' },
    { id:'templates', label:'Templates', icon:'📚', url:(q)=>q?`https://n8n.io/workflows/?search=${encodeURIComponent(q!)}`:'https://n8n.io/workflows' },
    { id:'docs', label:'Docs', icon:'📖', url:()=>'https://docs.n8n.io' },
  ]},
  { id:'clickup', name:'ClickUp', emoji:'🟣', category:'Productivity', desc:'Project management', baseUrl:'https://clickup.com', noKey:true, actions:[
    { id:'home', label:'Home', icon:'🏠', url:()=>'https://app.clickup.com' },
    { id:'new', label:'New Task', icon:'➕', url:()=>'https://app.clickup.com' },
  ]},
  { id:'calendly', name:'Calendly', emoji:'📅', category:'Productivity', desc:'Meeting scheduler', baseUrl:'https://calendly.com', noKey:true, actions:[
    { id:'new', label:'New Event Type', icon:'📅', url:()=>'https://calendly.com/event_types/new' },
    { id:'home', label:'Dashboard', icon:'📊', url:()=>'https://calendly.com' },
  ]},

  // ──────────────────────────────────────────────────────────
  // 💬 COMMUNICATION (8 apps)
  // ──────────────────────────────────────────────────────────
  { id:'whatsapp', name:'WhatsApp Web', emoji:'💬', category:'Communication', desc:'Messaging via web', baseUrl:'https://web.whatsapp.com', noKey:true, actions:[
    { id:'open', label:'Open WhatsApp', icon:'💬', url:()=>'https://web.whatsapp.com' },
    { id:'send', label:'Send Message', icon:'✉️', url:(q)=>q?`https://wa.me/?text=${encodeURIComponent(q!)}`:'https://web.whatsapp.com' },
    { id:'new_chat', label:'New Chat', icon:'📱', url:(q)=>q?`https://wa.me/${q}`:'https://web.whatsapp.com' },
  ]},
  { id:'telegram', name:'Telegram Web', emoji:'✈️', category:'Communication', desc:'Secure messaging', baseUrl:'https://web.telegram.org', noKey:true, actions:[
    { id:'open', label:'Open Telegram', icon:'✈️', url:()=>'https://web.telegram.org' },
    { id:'send', label:'Share Link', icon:'🔗', url:(q)=>q?`https://t.me/share/url?url=${encodeURIComponent(q!)}`:'https://web.telegram.org' },
  ]},
  { id:'gmail', name:'Gmail', emoji:'📧', category:'Communication', desc:'Google email', baseUrl:'https://mail.google.com', noKey:true, actions:[
    { id:'compose', label:'Compose', icon:'✏️', url:(q)=>q?`https://mail.google.com/mail/?view=cm&su=${encodeURIComponent(q!)}`:'https://mail.google.com/mail/?view=cm' },
    { id:'inbox', label:'Inbox', icon:'📧', url:()=>'https://mail.google.com' },
    { id:'search', label:'Search Mail', icon:'🔍', url:(q)=>q?`https://mail.google.com/mail/#search/${encodeURIComponent(q!)}`:'https://mail.google.com' },
  ]},
  { id:'discord', name:'Discord', emoji:'🎮', category:'Communication', desc:'Community & gaming chat', baseUrl:'https://discord.com', noKey:true, actions:[
    { id:'open', label:'Open Discord', icon:'🎮', url:()=>'https://discord.com/app' },
    { id:'explore', label:'Explore Servers', icon:'🔍', url:(q)=>q?`https://discord.com/discover/${encodeURIComponent(q!)}`:'https://discord.com/discover' },
    { id:'developers', label:'Developer Portal', icon:'⚙️', url:()=>'https://discord.com/developers/applications' },
  ]},
  { id:'slack', name:'Slack', emoji:'💬', category:'Communication', desc:'Team messaging platform', baseUrl:'https://slack.com', noKey:true, actions:[
    { id:'open', label:'Open Slack', icon:'💬', url:()=>'https://app.slack.com' },
    { id:'new_workspace', label:'New Workspace', icon:'➕', url:()=>'https://slack.com/create' },
  ]},
  { id:'twitter_x', name:'X (Twitter)', emoji:'🐦', category:'Communication', desc:'Social microblogging', baseUrl:'https://x.com', noKey:true, actions:[
    { id:'tweet', label:'New Post', icon:'✍️', url:(q)=>q?`https://x.com/intent/tweet?text=${encodeURIComponent(q!)}`:'https://x.com/compose/tweet' },
    { id:'search', label:'Search', icon:'🔍', url:(q)=>q?`https://x.com/search?q=${encodeURIComponent(q!)}`:'https://x.com/explore' },
    { id:'trending', label:'Trending', icon:'🔥', url:()=>'https://x.com/explore/tabs/trending' },
  ]},
  { id:'linkedin', name:'LinkedIn', emoji:'💼', category:'Communication', desc:'Professional networking', baseUrl:'https://linkedin.com', noKey:true, actions:[
    { id:'post', label:'New Post', icon:'✍️', url:(q)=>q?`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(q!)}`:'https://www.linkedin.com/feed/update/new' },
    { id:'search', label:'Search', icon:'🔍', url:(q)=>q?`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(q!)}`:'https://www.linkedin.com' },
    { id:'jobs', label:'Jobs', icon:'💼', url:(q)=>q?`https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(q!)}`:'https://www.linkedin.com/jobs' },
  ]},
  { id:'reddit', name:'Reddit', emoji:'🟠', category:'Communication', desc:'Social news aggregator', baseUrl:'https://reddit.com', noKey:true, actions:[
    { id:'search', label:'Search', icon:'🔍', url:(q)=>q?`https://www.reddit.com/search?q=${encodeURIComponent(q!)}`:'https://www.reddit.com' },
    { id:'new_post', label:'New Post', icon:'✍️', url:()=>'https://www.reddit.com/submit' },
    { id:'india', label:'r/India', icon:'🇮🇳', url:()=>'https://www.reddit.com/r/india' },
    { id:'programming', label:'r/Programming', icon:'💻', url:()=>'https://www.reddit.com/r/programming' },
  ]},

  // ──────────────────────────────────────────────────────────
  // 🇮🇳 INDIA SPECIFIC (12 apps)
  // ──────────────────────────────────────────────────────────
  { id:'irctc', name:'IRCTC', emoji:'🚂', category:'India', desc:'Indian Railway tickets', baseUrl:'https://www.irctc.co.in', noKey:true, india:true, actions:[
    { id:'book', label:'Book Ticket', icon:'🎫', url:()=>'https://www.irctc.co.in/nget/train-search' },
    { id:'pnr', label:'PNR Status', icon:'📋', url:(q)=>q?`https://www.irctc.co.in/nget/pnr-status?pnr=${q}`:'https://www.irctc.co.in/nget/pnr-status' },
    { id:'cancel', label:'Cancel Ticket', icon:'❌', url:()=>'https://www.irctc.co.in/nget/booked-ticket-details' },
    { id:'food', label:'e-Catering', icon:'🍽️', url:()=>'https://www.ecatering.irctc.co.in' },
  ]},
  { id:'gpay', name:'Google Pay', emoji:'💚', category:'India', desc:'UPI payment app', baseUrl:'https://pay.google.com', noKey:true, india:true, actions:[
    { id:'send', label:'Send Money', icon:'💸', url:(q)=>q?`https://pay.google.com/intl/en/about/`:'https://pay.google.com/intl/en/about/' },
    { id:'open', label:'Open GPay', icon:'💚', url:()=>'https://pay.google.com' },
  ]},
  { id:'phonepe', name:'PhonePe', emoji:'💜', category:'India', desc:'UPI payment & investment', baseUrl:'https://phonepe.com', noKey:true, india:true, actions:[
    { id:'open', label:'Open PhonePe', icon:'💜', url:()=>'https://www.phonepe.com' },
    { id:'mutual_fund', label:'Mutual Funds', icon:'📈', url:()=>'https://www.phonepe.com/mutual-funds' },
    { id:'insurance', label:'Insurance', icon:'🛡️', url:()=>'https://www.phonepe.com/insurance' },
  ]},
  { id:'paytm', name:'Paytm', emoji:'💳', category:'India', desc:'Payments & banking', baseUrl:'https://paytm.com', noKey:true, india:true, actions:[
    { id:'pay', label:'Pay', icon:'💳', url:()=>'https://paytm.com' },
    { id:'bank', label:'Paytm Bank', icon:'🏦', url:()=>'https://bank.paytm.com' },
    { id:'stocks', label:'Stocks', icon:'📈', url:()=>'https://www.paytmbank.com/stocks' },
  ]},
  { id:'digilocker', name:'DigiLocker', emoji:'🔐', category:'India', desc:'Government documents vault', baseUrl:'https://digilocker.gov.in', noKey:true, india:true, actions:[
    { id:'open', label:'Open DigiLocker', icon:'🔐', url:()=>'https://digilocker.gov.in' },
    { id:'aadhaar', label:'Aadhaar', icon:'🪪', url:()=>'https://resident.uidai.gov.in' },
    { id:'driving', label:'Driving License', icon:'🚗', url:()=>'https://sarathi.parivahan.gov.in' },
  ]},
  { id:'nta', name:'NTA (NEET/JEE)', emoji:'🩺', category:'India', desc:'National Testing Agency', baseUrl:'https://nta.ac.in', noKey:true, india:true, actions:[
    { id:'neet', label:'NEET', icon:'🩺', url:()=>'https://neet.nta.nic.in' },
    { id:'jee', label:'JEE Main', icon:'⚗️', url:()=>'https://jeemain.nta.ac.in' },
    { id:'results', label:'Results', icon:'📊', url:()=>'https://www.nta.ac.in/results' },
    { id:'admit', label:'Admit Card', icon:'🪪', url:()=>'https://www.nta.ac.in/download-admit-card' },
  ]},
  { id:'collegedunia', name:'CollegeDunia', emoji:'🏛️', category:'India', desc:'Indian college rankings', baseUrl:'https://collegedunia.com', noKey:true, india:true, actions:[
    { id:'search', label:'Search Colleges', icon:'🔍', url:(q)=>q?`https://collegedunia.com/search?term=${encodeURIComponent(q!)}`:'https://collegedunia.com' },
    { id:'medical', label:'Medical Colleges', icon:'🏥', url:()=>'https://collegedunia.com/mbbs' },
    { id:'rankings', label:'Rankings', icon:'🏆', url:()=>'https://collegedunia.com/college-ranking' },
  ]},
  { id:'moneycontrol', name:'Moneycontrol', emoji:'💹', category:'India', desc:'Indian finance & markets', baseUrl:'https://moneycontrol.com', noKey:true, india:true, actions:[
    { id:'markets', label:'Markets', icon:'📈', url:()=>'https://www.moneycontrol.com/markets' },
    { id:'news', label:'Finance News', icon:'📰', url:()=>'https://www.moneycontrol.com/news/business/markets' },
    { id:'portfolio', label:'Portfolio', icon:'💼', url:()=>'https://www.moneycontrol.com/portfolio-management/portfolio_overview.php' },
  ]},
  { id:'zerodha', name:'Zerodha Kite', emoji:'🪁', category:'India', desc:'Stock trading platform', baseUrl:'https://kite.zerodha.com', noKey:true, india:true, actions:[
    { id:'open', label:'Open Kite', icon:'🪁', url:()=>'https://kite.zerodha.com' },
    { id:'varsity', label:'Varsity (Learn)', icon:'📚', url:(q)=>q?`https://zerodha.com/varsity/module-search?search=${encodeURIComponent(q!)}`:'https://zerodha.com/varsity' },
  ]},
  { id:'groww', name:'Groww', emoji:'🌱', category:'India', desc:'Mutual funds & stocks', baseUrl:'https://groww.in', noKey:true, india:true, actions:[
    { id:'open', label:'Open Groww', icon:'🌱', url:()=>'https://groww.in' },
    { id:'mf', label:'Mutual Funds', icon:'💰', url:()=>'https://groww.in/mutual-funds' },
    { id:'stocks', label:'Stocks', icon:'📈', url:(q)=>q?`https://groww.in/stocks/search?q=${encodeURIComponent(q!)}`:'https://groww.in/stocks' },
  ]},
  { id:'upi_apps', name:'UPI QR Generator', emoji:'📱', category:'India', desc:'Generate UPI QR codes', baseUrl:'https://upilink.in', noKey:true, india:true, actions:[
    { id:'generate', label:'Generate QR', icon:'📱', url:(q)=>q?`https://upilink.in/?upi=${encodeURIComponent(q!)}`:'https://upilink.in' },
  ]},
  { id:'justdial', name:'JustDial', emoji:'📞', category:'India', desc:'Local business search India', baseUrl:'https://justdial.com', noKey:true, india:true, actions:[
    { id:'search', label:'Search Businesses', icon:'🔍', url:(q)=>q?`https://www.justdial.com/${encodeURIComponent(q!)}`:'https://www.justdial.com' },
  ]},

  // ──────────────────────────────────────────────────────────
  // 🎓 EDUCATION (8 apps)
  // ──────────────────────────────────────────────────────────
  { id:'wolfram', name:'Wolfram Alpha', emoji:'🧮', category:'Education', desc:'Computational intelligence', baseUrl:'https://wolframalpha.com', noKey:true, actions:[
    { id:'compute', label:'Compute', icon:'🧮', url:(q)=>q?`https://www.wolframalpha.com/input/?i=${encodeURIComponent(q!)}`:'https://www.wolframalpha.com' },
    { id:'math', label:'Math', icon:'📐', url:(q)=>q?`https://www.wolframalpha.com/input/?i=${encodeURIComponent(q!)}`:'https://www.wolframalpha.com/examples/mathematics' },
    { id:'chemistry', label:'Chemistry', icon:'⚗️', url:()=>'https://www.wolframalpha.com/examples/science/chemistry' },
  ]},
  { id:'desmos', name:'Desmos', emoji:'📈', category:'Education', desc:'Graphing calculator online', baseUrl:'https://desmos.com', noKey:true, actions:[
    { id:'graph', label:'Graphing Calc', icon:'📈', url:(q)=>q?`https://www.desmos.com/calculator?expr=${encodeURIComponent(q!)}`:'https://www.desmos.com/calculator' },
    { id:'geo', label:'Geometry', icon:'📐', url:()=>'https://www.desmos.com/geometry' },
    { id:'sci', label:'Scientific Calc', icon:'🔢', url:()=>'https://www.desmos.com/scientific' },
  ]},
  { id:'khan', name:'Khan Academy', emoji:'🎓', category:'Education', desc:'Free world-class education', baseUrl:'https://khanacademy.org', noKey:true, actions:[
    { id:'search', label:'Search', icon:'🔍', url:(q)=>q?`https://www.khanacademy.org/search?page_search_query=${encodeURIComponent(q!)}`:'https://www.khanacademy.org' },
    { id:'math', label:'Math', icon:'📐', url:()=>'https://www.khanacademy.org/math' },
    { id:'science', label:'Science', icon:'🔬', url:()=>'https://www.khanacademy.org/science' },
    { id:'computer', label:'Coding', icon:'💻', url:()=>'https://www.khanacademy.org/computing' },
    { id:'neet_prep', label:'NEET Prep', icon:'🩺', url:()=>'https://www.khanacademy.org/science' },
  ]},
  { id:'pw', name:'Physics Wallah', emoji:'🧪', category:'Education', desc:'NEET/JEE free coaching', baseUrl:'https://pw.live', noKey:true, india:true, actions:[
    { id:'open', label:'Open PW', icon:'🧪', url:()=>'https://pw.live' },
    { id:'neet', label:'NEET', icon:'🩺', url:()=>'https://pw.live/course/neet' },
    { id:'jee', label:'JEE', icon:'⚗️', url:()=>'https://pw.live/course/jee' },
    { id:'test', label:'Practice Tests', icon:'📝', url:()=>'https://pw.live/test-series' },
  ]},
  { id:'unacademy', name:'Unacademy', emoji:'📚', category:'Education', desc:'Online learning platform', baseUrl:'https://unacademy.com', noKey:true, india:true, actions:[
    { id:'search', label:'Search Courses', icon:'🔍', url:(q)=>q?`https://unacademy.com/search/${encodeURIComponent(q!)}`:'https://unacademy.com' },
    { id:'neet', label:'NEET', icon:'🩺', url:()=>'https://unacademy.com/goal/neet-ug' },
    { id:'upsc', label:'UPSC', icon:'🏛️', url:()=>'https://unacademy.com/goal/ias' },
  ]},
  { id:'coursera', name:'Coursera', emoji:'🌐', category:'Education', desc:'Online university courses', baseUrl:'https://coursera.org', noKey:true, actions:[
    { id:'search', label:'Search Courses', icon:'🔍', url:(q)=>q?`https://www.coursera.org/search?query=${encodeURIComponent(q!)}`:'https://www.coursera.org' },
    { id:'free', label:'Free Courses', icon:'💚', url:()=>'https://www.coursera.org/courses?query=free' },
  ]},
  { id:'github_edu', name:'GitHub Education', emoji:'🎓', category:'Education', desc:'Free developer tools for students', baseUrl:'https://education.github.com', noKey:true, actions:[
    { id:'pack', label:'Student Pack', icon:'🎁', url:()=>'https://education.github.com/pack' },
    { id:'apply', label:'Apply', icon:'📝', url:()=>'https://education.github.com/discount_requests/application' },
  ]},
  { id:'brilliant', name:'Brilliant', emoji:'💡', category:'Education', desc:'Math & science problem solving', baseUrl:'https://brilliant.org', noKey:true, actions:[
    { id:'explore', label:'Explore Courses', icon:'🔍', url:(q)=>q?`https://brilliant.org/search/?q=${encodeURIComponent(q!)}`:'https://brilliant.org/courses' },
  ]},

  // ──────────────────────────────────────────────────────────
  // 🏋️ HEALTH & FITNESS (5 apps)
  // ──────────────────────────────────────────────────────────
  { id:'healthifyme', name:'HealthifyMe', emoji:'🥗', category:'Health & Fitness', desc:'Calorie & fitness tracker', baseUrl:'https://healthifyme.com', noKey:true, india:true, actions:[
    { id:'calories', label:'Calorie Chart', icon:'🍽️', url:(q)=>q?`https://www.healthifyme.com/blog/${encodeURIComponent(q!)}`:'https://www.healthifyme.com/calorie-counter' },
    { id:'bmi', label:'BMI Calculator', icon:'⚖️', url:()=>'https://www.healthifyme.com/bmi-calculator' },
  ]},
  { id:'webmd', name:'WebMD', emoji:'🏥', category:'Health & Fitness', desc:'Medical information & symptoms', baseUrl:'https://webmd.com', noKey:true, actions:[
    { id:'symptoms', label:'Symptom Checker', icon:'🤒', url:()=>'https://symptoms.webmd.com' },
    { id:'search', label:'Search', icon:'🔍', url:(q)=>q?`https://www.webmd.com/search/search_results/default.aspx?query=${encodeURIComponent(q!)}`:'https://www.webmd.com' },
  ]},
  { id:'medlineplus', name:'MedlinePlus', emoji:'💊', category:'Health & Fitness', desc:'NIH medical encyclopedia', baseUrl:'https://medlineplus.gov', noKey:true, actions:[
    { id:'search', label:'Search', icon:'🔍', url:(q)=>q?`https://medlineplus.gov/search/results/?query=${encodeURIComponent(q!)}`:'https://medlineplus.gov' },
    { id:'drugs', label:'Drug Info', icon:'💊', url:(q)=>q?`https://medlineplus.gov/druginfo/search/?query=${encodeURIComponent(q!)}`:'https://medlineplus.gov/druginformation.html' },
  ]},
  { id:'yoga_journal', name:'Yoga Journal', emoji:'🧘', category:'Health & Fitness', desc:'Yoga poses & practices', baseUrl:'https://yogajournal.com', noKey:true, actions:[
    { id:'poses', label:'Pose Library', icon:'🧘', url:(q)=>q?`https://www.yogajournal.com/?s=${encodeURIComponent(q!)}`:'https://www.yogajournal.com/pose-finder/' },
  ]},
  { id:'myfitnesspal', name:'MyFitnessPal', emoji:'🏃', category:'Health & Fitness', desc:'Calorie & food tracker', baseUrl:'https://myfitnesspal.com', noKey:true, actions:[
    { id:'food', label:'Search Food', icon:'🍽️', url:(q)=>q?`https://www.myfitnesspal.com/food/search?search=${encodeURIComponent(q!)}`:'https://www.myfitnesspal.com' },
    { id:'exercise', label:'Exercises', icon:'💪', url:()=>'https://www.myfitnesspal.com/exercise/lookup' },
  ]},

  // ──────────────────────────────────────────────────────────
  // ☁️ CLOUD & STORAGE (6 apps)
  // ──────────────────────────────────────────────────────────
  { id:'gdrive', name:'Google Drive', emoji:'💛', category:'Cloud & Storage', desc:'Cloud file storage 15GB free', baseUrl:'https://drive.google.com', noKey:true, actions:[
    { id:'open', label:'Open Drive', icon:'💛', url:()=>'https://drive.google.com' },
    { id:'new', label:'New File', icon:'➕', url:()=>'https://drive.google.com/drive/u/0/my-drive' },
    { id:'shared', label:'Shared', icon:'👥', url:()=>'https://drive.google.com/drive/shared-with-me' },
  ]},
  { id:'dropbox', name:'Dropbox', emoji:'📦', category:'Cloud & Storage', desc:'Cloud storage & sync', baseUrl:'https://dropbox.com', noKey:true, actions:[
    { id:'open', label:'Open Dropbox', icon:'📦', url:()=>'https://www.dropbox.com/home' },
    { id:'upload', label:'Upload', icon:'⬆️', url:()=>'https://www.dropbox.com/upload' },
  ]},
  { id:'puter_app', name:'Puter Cloud', emoji:'☁️', category:'Cloud & Storage', desc:'Free 1GB cloud storage + AI', baseUrl:'https://puter.com', noKey:true, actions:[
    { id:'open', label:'Open Puter', icon:'☁️', url:()=>'https://puter.com' },
    { id:'files', label:'Files', icon:'📁', url:()=>'https://puter.com/app/editor' },
    { id:'signup', label:'Get Free 1GB', icon:'💚', url:()=>'https://puter.com/sign-up' },
  ]},
  { id:'wetransfer', name:'WeTransfer', emoji:'✈️', category:'Cloud & Storage', desc:'Send large files free', baseUrl:'https://wetransfer.com', noKey:true, actions:[
    { id:'send', label:'Send Files', icon:'📤', url:()=>'https://wetransfer.com' },
  ]},
  { id:'mega', name:'MEGA', emoji:'📁', category:'Cloud & Storage', desc:'Encrypted cloud storage 20GB free', baseUrl:'https://mega.nz', noKey:true, actions:[
    { id:'open', label:'Open MEGA', icon:'📁', url:()=>'https://mega.nz/fm' },
    { id:'signup', label:'Get 20GB Free', icon:'💚', url:()=>'https://mega.nz/register' },
  ]},
  { id:'onedrive', name:'OneDrive', emoji:'🔵', category:'Cloud & Storage', desc:'Microsoft 5GB cloud storage', baseUrl:'https://onedrive.live.com', noKey:true, actions:[
    { id:'open', label:'Open OneDrive', icon:'🔵', url:()=>'https://onedrive.live.com' },
  ]},

  // ──────────────────────────────────────────────────────────
  // 📄 PDF & FILES (5 apps)
  // ──────────────────────────────────────────────────────────
  { id:'ilovepdf', name:'iLovePDF', emoji:'❤️', category:'PDF & Files', desc:'All PDF tools online', baseUrl:'https://ilovepdf.com', noKey:true, actions:[
    { id:'merge', label:'Merge PDFs', icon:'📎', url:()=>'https://www.ilovepdf.com/merge_pdf' },
    { id:'split', label:'Split PDF', icon:'✂️', url:()=>'https://www.ilovepdf.com/split_pdf' },
    { id:'compress', label:'Compress PDF', icon:'🗜️', url:()=>'https://www.ilovepdf.com/compress_pdf' },
    { id:'word', label:'PDF to Word', icon:'📝', url:()=>'https://www.ilovepdf.com/pdf_to_word' },
    { id:'jpg', label:'PDF to JPG', icon:'🖼️', url:()=>'https://www.ilovepdf.com/pdf_to_jpg' },
    { id:'protect', label:'Protect PDF', icon:'🔒', url:()=>'https://www.ilovepdf.com/protect_pdf' },
  ]},
  { id:'smallpdf', name:'SmallPDF', emoji:'📄', category:'PDF & Files', desc:'Compress and convert PDFs', baseUrl:'https://smallpdf.com', noKey:true, actions:[
    { id:'compress', label:'Compress', icon:'🗜️', url:()=>'https://smallpdf.com/compress-pdf' },
    { id:'merge', label:'Merge', icon:'📎', url:()=>'https://smallpdf.com/merge-pdf' },
    { id:'word', label:'PDF to Word', icon:'📝', url:()=>'https://smallpdf.com/pdf-to-word' },
  ]},
  { id:'pdf2go', name:'PDF2Go', emoji:'📝', category:'PDF & Files', desc:'Online PDF editor', baseUrl:'https://www.pdf2go.com', noKey:true, actions:[
    { id:'edit', label:'Edit PDF', icon:'✏️', url:()=>'https://www.pdf2go.com/pdf-editor' },
    { id:'sign', label:'Sign PDF', icon:'✍️', url:()=>'https://www.pdf2go.com/sign-pdf' },
    { id:'ocr', label:'OCR PDF', icon:'🔤', url:()=>'https://www.pdf2go.com/ocr-pdf' },
  ]},
  { id:'convertio', name:'Convertio', emoji:'🔄', category:'PDF & Files', desc:'Convert any file format', baseUrl:'https://convertio.co', noKey:true, actions:[
    { id:'convert', label:'Convert File', icon:'🔄', url:()=>'https://convertio.co' },
    { id:'pdf', label:'To PDF', icon:'📄', url:()=>'https://convertio.co/pdf-converter/' },
    { id:'mp4', label:'To MP4', icon:'🎥', url:()=>'https://convertio.co/mp4-converter/' },
  ]},
  { id:'virustotal', name:'VirusTotal', emoji:'🛡️', category:'PDF & Files', desc:'Scan files for viruses', baseUrl:'https://virustotal.com', noKey:true, actions:[
    { id:'scan_url', label:'Scan URL', icon:'🔗', url:(q)=>q?`https://www.virustotal.com/gui/search/${encodeURIComponent(q!)}`:'https://www.virustotal.com/gui/home/url' },
    { id:'scan_file', label:'Scan File', icon:'📁', url:()=>'https://www.virustotal.com/gui/home/upload' },
  ]},

  // ──────────────────────────────────────────────────────────
  // 🛡️ SECURITY & PRIVACY (4 apps)
  // ──────────────────────────────────────────────────────────
  { id:'haveibeenpwned', name:'HaveIBeenPwned', emoji:'🔓', category:'Security & Privacy', desc:'Check if email was breached', baseUrl:'https://haveibeenpwned.com', noKey:true, actions:[
    { id:'check', label:'Check Email', icon:'📧', url:(q)=>q?`https://haveibeenpwned.com/account/${encodeURIComponent(q!)}`:'https://haveibeenpwned.com' },
  ]},
  { id:'bitwarden', name:'Bitwarden', emoji:'🔒', category:'Security & Privacy', desc:'Open-source password manager', baseUrl:'https://bitwarden.com', noKey:true, actions:[
    { id:'vault', label:'Open Vault', icon:'🔒', url:()=>'https://vault.bitwarden.com' },
    { id:'generator', label:'Password Generator', icon:'🎲', url:()=>'https://bitwarden.com/password-generator/' },
  ]},
  { id:'protonvpn', name:'Proton VPN', emoji:'🛡️', category:'Security & Privacy', desc:'Free privacy VPN', baseUrl:'https://protonvpn.com', noKey:true, actions:[
    { id:'open', label:'Open', icon:'🛡️', url:()=>'https://protonvpn.com' },
    { id:'free', label:'Free Plan', icon:'💚', url:()=>'https://protonvpn.com/pricing' },
  ]},
  { id:'temp_mail', name:'Temp Mail', emoji:'📮', category:'Security & Privacy', desc:'Disposable email addresses', baseUrl:'https://temp-mail.org', noKey:true, actions:[
    { id:'get', label:'Get Temp Email', icon:'📮', url:()=>'https://temp-mail.org' },
    { id:'10min', label:'10-min Mail', icon:'⏱️', url:()=>'https://10minutemail.com' },
  ]},

  // ──────────────────────────────────────────────────────────
  // 🛒 SHOPPING (4 apps)
  // ──────────────────────────────────────────────────────────
  { id:'amazon', name:'Amazon India', emoji:'📦', category:'Shopping', desc:'Online shopping', baseUrl:'https://amazon.in', noKey:true, india:true, actions:[
    { id:'search', label:'Search', icon:'🔍', url:(q)=>q?`https://www.amazon.in/s?k=${encodeURIComponent(q!)}`:'https://www.amazon.in' },
    { id:'deals', label:'Today\'s Deals', icon:'🏷️', url:()=>'https://www.amazon.in/deals' },
    { id:'prime', label:'Prime', icon:'⭐', url:()=>'https://www.amazon.in/prime' },
  ]},
  { id:'flipkart', name:'Flipkart', emoji:'🛒', category:'Shopping', desc:'India\'s e-commerce leader', baseUrl:'https://flipkart.com', noKey:true, india:true, actions:[
    { id:'search', label:'Search', icon:'🔍', url:(q)=>q?`https://www.flipkart.com/search?q=${encodeURIComponent(q!)}`:'https://www.flipkart.com' },
    { id:'deals', label:'Big Deals', icon:'🏷️', url:()=>'https://www.flipkart.com/offers-store' },
  ]},
  { id:'meesho', name:'Meesho', emoji:'🎀', category:'Shopping', desc:'Affordable online shopping', baseUrl:'https://meesho.com', noKey:true, india:true, actions:[
    { id:'search', label:'Search', icon:'🔍', url:(q)=>q?`https://www.meesho.com/search?q=${encodeURIComponent(q!)}`:'https://www.meesho.com' },
  ]},
  { id:'pricespy', name:'Price Comparison', emoji:'💰', category:'Shopping', desc:'Compare prices across stores', baseUrl:'https://pricebaba.com', noKey:true, india:true, actions:[
    { id:'compare', label:'Compare Prices', icon:'💰', url:(q)=>q?`https://pricebaba.com/search/${encodeURIComponent(q!)}`:'https://pricebaba.com' },
    { id:'mobile', label:'Mobile Prices', icon:'📱', url:(q)=>q?`https://www.91mobiles.com/search.php?q=${encodeURIComponent(q!)}`:'https://www.91mobiles.com' },
  ]},

  // ──────────────────────────────────────────────────────────
  // ✈️ TRAVEL (6 apps)
  // ──────────────────────────────────────────────────────────
  { id:'makemytrip', name:'MakeMyTrip', emoji:'✈️', category:'Travel', desc:'Flights, hotels, holidays India', baseUrl:'https://makemytrip.com', noKey:true, india:true, actions:[
    { id:'flights', label:'Flights', icon:'✈️', url:()=>'https://www.makemytrip.com/flights' },
    { id:'hotels', label:'Hotels', icon:'🏨', url:()=>'https://www.makemytrip.com/hotels' },
    { id:'train', label:'Trains', icon:'🚂', url:()=>'https://www.makemytrip.com/railways' },
    { id:'bus', label:'Bus', icon:'🚌', url:()=>'https://www.makemytrip.com/bus-tickets' },
  ]},
  { id:'goibibo', name:'Goibibo', emoji:'🛫', category:'Travel', desc:'Travel booking India', baseUrl:'https://goibibo.com', noKey:true, india:true, actions:[
    { id:'flights', label:'Flights', icon:'✈️', url:()=>'https://www.goibibo.com/flights' },
    { id:'hotels', label:'Hotels', icon:'🏨', url:()=>'https://www.goibibo.com/hotels' },
  ]},
  { id:'booking', name:'Booking.com', emoji:'🏨', category:'Travel', desc:'Hotel & travel booking worldwide', baseUrl:'https://booking.com', noKey:true, actions:[
    { id:'hotels', label:'Search Hotels', icon:'🏨', url:(q)=>q?`https://www.booking.com/search.html?ss=${encodeURIComponent(q!)}`:'https://www.booking.com' },
    { id:'flights', label:'Flights', icon:'✈️', url:()=>'https://flights.booking.com' },
    { id:'attractions', label:'Attractions', icon:'🗺️', url:(q)=>q?`https://www.booking.com/attractions/searchresults/${encodeURIComponent(q!)}.html`:'https://www.booking.com/attractions/index.html' },
  ]},
  { id:'skyscanner', name:'Skyscanner', emoji:'🌤️', category:'Travel', desc:'Compare cheap flights', baseUrl:'https://skyscanner.net', noKey:true, actions:[
    { id:'flights', label:'Search Flights', icon:'✈️', url:(q)=>q?`https://www.skyscanner.net/transport/flights/${encodeURIComponent(q!)}`:'https://www.skyscanner.net' },
    { id:'hotels', label:'Hotels', icon:'🏨', url:()=>'https://www.skyscanner.net/hotels' },
  ]},
  { id:'google_maps', name:'Google Maps', emoji:'🗺️', category:'Travel', desc:'Navigation & directions', baseUrl:'https://maps.google.com', noKey:true, actions:[
    { id:'search', label:'Search Place', icon:'📍', url:(q)=>q?`https://www.google.com/maps/search/${encodeURIComponent(q!)}`:'https://maps.google.com' },
    { id:'directions', label:'Directions', icon:'🧭', url:(q)=>q?`https://www.google.com/maps/dir/${encodeURIComponent(q!)}`:'https://maps.google.com' },
    { id:'nearby', label:'Nearby', icon:'📡', url:()=>'https://www.google.com/maps/search/nearby' },
    { id:'street_view', label:'Street View', icon:'🏙️', url:()=>'https://www.google.com/maps/@?layer=pano' },
  ]},
  { id:'tripadvisor', name:'TripAdvisor', emoji:'🦉', category:'Travel', desc:'Travel reviews & recommendations', baseUrl:'https://tripadvisor.in', noKey:true, actions:[
    { id:'search', label:'Search', icon:'🔍', url:(q)=>q?`https://www.tripadvisor.in/Search?q=${encodeURIComponent(q!)}`:'https://www.tripadvisor.in' },
    { id:'hotels', label:'Hotels', icon:'🏨', url:()=>'https://www.tripadvisor.in/Hotels' },
    { id:'attractions', label:'Attractions', icon:'🗺️', url:()=>'https://www.tripadvisor.in/Attractions' },
  ]},

  // ──────────────────────────────────────────────────────────
  // 🎮 ENTERTAINMENT (8 apps)
  // ──────────────────────────────────────────────────────────
  { id:'netflix', name:'Netflix', emoji:'🎬', category:'Entertainment', desc:'Streaming movies & shows', baseUrl:'https://netflix.com', noKey:true, actions:[
    { id:'browse', label:'Browse', icon:'🎬', url:()=>'https://www.netflix.com/browse' },
    { id:'search', label:'Search', icon:'🔍', url:(q)=>q?`https://www.netflix.com/search?q=${encodeURIComponent(q!)}`:'https://www.netflix.com/browse' },
    { id:'new', label:'New & Hot', icon:'🔥', url:()=>'https://www.netflix.com/browse/new-releases' },
  ]},
  { id:'hotstar', name:'JioCinema/Hotstar', emoji:'⭐', category:'Entertainment', desc:'Indian streaming platform', baseUrl:'https://www.jiocinema.com', noKey:true, india:true, actions:[
    { id:'browse', label:'Browse', icon:'⭐', url:()=>'https://www.jiocinema.com' },
    { id:'ipl', label:'IPL Cricket', icon:'🏏', url:()=>'https://www.jiocinema.com/sports/cricket' },
    { id:'hindi', label:'Hindi Movies', icon:'🎬', url:()=>'https://www.jiocinema.com/movies/hindi' },
  ]},
  { id:'prime', name:'Amazon Prime Video', emoji:'📺', category:'Entertainment', desc:'Prime video streaming', baseUrl:'https://primevideo.com', noKey:true, actions:[
    { id:'browse', label:'Browse', icon:'📺', url:()=>'https://www.primevideo.com' },
    { id:'search', label:'Search', icon:'🔍', url:(q)=>q?`https://www.primevideo.com/search/ref=atv_sr_sug_4?phrase=${encodeURIComponent(q!)}`:'https://www.primevideo.com' },
  ]},
  { id:'tmdb', name:'TMDB', emoji:'🎭', category:'Entertainment', desc:'Movie & TV database', baseUrl:'https://themoviedb.org', hasRealApi:true, apiKeyId:'TMDB_API_KEY', apiKeyFree:true, noKey:true, actions:[
    { id:'search', label:'Search', icon:'🔍', url:(q)=>q?`https://www.themoviedb.org/search?query=${encodeURIComponent(q!)}`:'https://www.themoviedb.org' },
    { id:'trending', label:'Trending', icon:'🔥', url:()=>'https://www.themoviedb.org/trending/all/week' },
    { id:'movies', label:'Popular Movies', icon:'🎬', url:()=>'https://www.themoviedb.org/movie' },
    { id:'tv', label:'Popular TV', icon:'📺', url:()=>'https://www.themoviedb.org/tv' },
  ]},
  { id:'justwatch', name:'JustWatch', emoji:'📡', category:'Entertainment', desc:'Where to stream movies', baseUrl:'https://justwatch.com', noKey:true, actions:[
    { id:'search', label:'Find Where to Watch', icon:'🔍', url:(q)=>q?`https://www.justwatch.com/in/search?q=${encodeURIComponent(q!)}`:'https://www.justwatch.com/in' },
    { id:'new', label:'New Movies', icon:'🆕', url:()=>'https://www.justwatch.com/in/new' },
  ]},
  { id:'rottentomatoes', name:'Rotten Tomatoes', emoji:'🍅', category:'Entertainment', desc:'Movie & TV reviews', baseUrl:'https://rottentomatoes.com', noKey:true, actions:[
    { id:'search', label:'Search', icon:'🔍', url:(q)=>q?`https://www.rottentomatoes.com/search?search=${encodeURIComponent(q!)}`:'https://www.rottentomatoes.com' },
    { id:'top', label:'Top Movies', icon:'🏆', url:()=>'https://www.rottentomatoes.com/top' },
  ]},
  { id:'imdb', name:'IMDB', emoji:'⭐', category:'Entertainment', desc:'Internet Movie Database', baseUrl:'https://imdb.com', noKey:true, actions:[
    { id:'search', label:'Search', icon:'🔍', url:(q)=>q?`https://www.imdb.com/find?q=${encodeURIComponent(q!)}`:'https://www.imdb.com' },
    { id:'top250', label:'Top 250 Movies', icon:'🏆', url:()=>'https://www.imdb.com/chart/top' },
    { id:'bollywood', label:'Bollywood', icon:'🎬', url:()=>'https://www.imdb.com/india/toprated-tamil-movies/' },
  ]},
  { id:'archive', name:'Internet Archive', emoji:'📚', category:'Entertainment', desc:'Free books, movies, music archive', baseUrl:'https://archive.org', noKey:true, actions:[
    { id:'search', label:'Search Archive', icon:'🔍', url:(q)=>q?`https://archive.org/search?query=${encodeURIComponent(q!)}`:'https://archive.org' },
    { id:'books', label:'Free Books', icon:'📚', url:(q)=>q?`https://archive.org/search?query=${encodeURIComponent(q!)}&mediatype=texts`:'https://archive.org/details/texts' },
    { id:'movies', label:'Free Movies', icon:'🎬', url:()=>'https://archive.org/details/feature_films' },
    { id:'music', label:'Free Music', icon:'🎵', url:()=>'https://archive.org/details/audio' },
  ]},

  // ──────────────────────────────────────────────────────────
  // 🔧 DEVELOPER TOOLS (8 apps)
  // ──────────────────────────────────────────────────────────
  { id:'stackoverflow', name:'Stack Overflow', emoji:'❓', category:'Developer Tools', desc:'Programming Q&A', baseUrl:'https://stackoverflow.com', noKey:true, actions:[
    { id:'search', label:'Search', icon:'🔍', url:(q)=>q?`https://stackoverflow.com/search?q=${encodeURIComponent(q!)}`:'https://stackoverflow.com' },
    { id:'ask', label:'Ask Question', icon:'❓', url:(q)=>q?`https://stackoverflow.com/questions/ask?title=${encodeURIComponent(q!)}`:'https://stackoverflow.com/questions/ask' },
    { id:'trending', label:'Hot Questions', icon:'🔥', url:()=>'https://stackoverflow.com/questions?sort=hot' },
  ]},
  { id:'caniuse', name:'Can I Use', emoji:'✅', category:'Developer Tools', desc:'Browser support tables', baseUrl:'https://caniuse.com', noKey:true, actions:[
    { id:'search', label:'Check Support', icon:'🔍', url:(q)=>q?`https://caniuse.com/search?search=${encodeURIComponent(q!)}`:'https://caniuse.com' },
  ]},
  { id:'jsonlint', name:'JSONLint', emoji:'{ }', category:'Developer Tools', desc:'Validate & format JSON', baseUrl:'https://jsonlint.com', noKey:true, actions:[
    { id:'validate', label:'Validate JSON', icon:'✅', url:()=>'https://jsonlint.com' },
  ]},
  { id:'postman', name:'Postman', emoji:'📮', category:'Developer Tools', desc:'API testing platform', baseUrl:'https://postman.com', noKey:true, actions:[
    { id:'workspace', label:'Workspace', icon:'📮', url:()=>'https://web.postman.co' },
    { id:'new', label:'New Request', icon:'➕', url:()=>'https://web.postman.co/workspaces/new' },
    { id:'learn', label:'API Learning', icon:'📚', url:()=>'https://learning.postman.com' },
  ]},
  { id:'swagger', name:'Swagger Editor', emoji:'📖', category:'Developer Tools', desc:'OpenAPI spec editor', baseUrl:'https://editor.swagger.io', noKey:true, actions:[
    { id:'edit', label:'Open Editor', icon:'📝', url:()=>'https://editor.swagger.io' },
  ]},
  { id:'ngrok', name:'ngrok', emoji:'🔗', category:'Developer Tools', desc:'Expose local server to internet', baseUrl:'https://ngrok.com', noKey:true, actions:[
    { id:'docs', label:'Docs', icon:'📖', url:()=>'https://ngrok.com/docs' },
    { id:'dashboard', label:'Dashboard', icon:'📊', url:()=>'https://dashboard.ngrok.com' },
  ]},
  { id:'supabase_app', name:'Supabase', emoji:'🟢', category:'Developer Tools', desc:'Open-source Firebase alternative', baseUrl:'https://supabase.com', noKey:true, actions:[
    { id:'dashboard', label:'Dashboard', icon:'📊', url:()=>'https://supabase.com/dashboard' },
    { id:'new', label:'New Project', icon:'➕', url:()=>'https://supabase.com/dashboard/new' },
    { id:'docs', label:'Docs', icon:'📖', url:(q)=>q?`https://supabase.com/docs/search?q=${encodeURIComponent(q!)}`:'https://supabase.com/docs' },
  ]},
  { id:'firebase_console', name:'Firebase', emoji:'🔥', category:'Developer Tools', desc:'Google app development platform', baseUrl:'https://console.firebase.google.com', noKey:true, actions:[
    { id:'console', label:'Console', icon:'📊', url:()=>'https://console.firebase.google.com' },
    { id:'new', label:'New Project', icon:'➕', url:()=>'https://console.firebase.google.com' },
    { id:'hosting', label:'Hosting', icon:'🌐', url:()=>'https://firebase.google.com/docs/hosting' },
  ]},
]

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

export const ALL_CATEGORIES: MegaCategory[] = [
  'AI Tools', 'Design & Art', 'Code & Dev', 'Media & Music',
  'Photos & Video', 'Docs & Notes', 'Productivity', 'Communication',
  'India', 'Education', 'Finance', 'Cloud & Storage',
  'Social Media', 'Entertainment', 'Developer Tools', 'Security & Privacy',
  'PDF & Files', 'Health & Fitness', 'Shopping', 'Travel',
]

export const CATEGORY_EMOJI: Record<MegaCategory, string> = {
  'AI Tools': '🤖', 'Design & Art': '🎨', 'Code & Dev': '💻',
  'Media & Music': '🎵', 'Photos & Video': '📷', 'Docs & Notes': '📝',
  'Productivity': '⚡', 'Communication': '💬', 'India': '🇮🇳',
  'Education': '🎓', 'Finance': '💹', 'Cloud & Storage': '☁️',
  'Social Media': '📱', 'Entertainment': '🎬', 'Developer Tools': '🔧',
  'Security & Privacy': '🛡️', 'PDF & Files': '📄', 'Health & Fitness': '🏋️',
  'Shopping': '🛒', 'Travel': '✈️',
}

export function getMegaApp(id: string): MegaApp | undefined {
  return MEGA_APPS.find(a => a.id === id)
}

export function getMegaByCategory(cat: MegaCategory): MegaApp[] {
  return MEGA_APPS.filter(a => a.category === cat)
}

export function searchMegaApps(query: string, limit = 10): MegaApp[] {
  const q = query.toLowerCase()
  return MEGA_APPS.filter(a =>
    a.id.includes(q) || a.name.toLowerCase().includes(q) ||
    a.desc.toLowerCase().includes(q) || a.category.toLowerCase().includes(q) ||
    (a.tags || []).some(t => t.includes(q)) ||
    a.actions.some(act => act.label.toLowerCase().includes(q))
  ).slice(0, limit)
}

// Stats
export const MEGA_STATS = {
  total: MEGA_APPS.length,
  noKey: MEGA_APPS.filter(a => a.noKey).length,
  withApi: MEGA_APPS.filter(a => a.hasRealApi).length,
  india: MEGA_APPS.filter(a => a.india).length,
  categories: ALL_CATEGORIES.length,
  totalActions: MEGA_APPS.reduce((s, a) => s + a.actions.length, 0),
}
