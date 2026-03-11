// lib/tools/intent.ts — JARVIS Intent Engine v1
// Pure regex + keyword matching, ZERO API calls, <1ms execution
// Detects 20+ tool categories from Hinglish queries
// Supports 150+ tool slots without slowing down

export type ToolCategory =
  | 'weather' | 'time' | 'news' | 'finance' | 'knowledge'
  | 'location' | 'india' | 'education' | 'entertainment'
  | 'image_gen' | 'productivity' | 'science' | 'health'
  | 'sports' | 'food' | 'fun' | 'search' | 'code' | 'travel' | 'android' | 'none'

export interface IntentResult {
  categories: ToolCategory[]    // ordered by confidence
  confidence: number            // 0-1
  extractedArgs: Record<string, string>   // pre-extracted params
  maxTools: number              // 1 or 2
  skipTools: boolean            // true for pure chitchat/math
  reason: string                // debug string
}

// ── Pre-compiled patterns (loaded once, reused forever) ───
const PATTERNS: { cat: ToolCategory; weight: number; re: RegExp }[] = [

  // WEATHER — highest specificity
  { cat: 'weather', weight: 10, re: /\b(weather|mausam|मौसम|barish|बारिश|rain|temperature|tापमान|forecast|humidity|nami|ठंड|garmi|गर्मी|dhoop|धूप|aandhi|आंधी|badal|बादल|baarish|drizzle|sunny|cloudy|wind|हवा)\b/i },
  { cat: 'weather', weight: 8,  re: /\b(aaj ka mausam|kal ka mausam|is hafte|temperature kya|kitni thand|kitni garmi|rain hoga|barish hogi)\b/i },

  // TIME & DATE
  { cat: 'time', weight: 10, re: /\b(time|samay|समय|waqt|वक्त|baje|बजे|date|taareekh|तारीख|aaj|आज|kal|कल|din|दिन|din|ghadi|घड़ी|clock|abhi|अभी|kitne baje|kya time)\b/i },
  { cat: 'time', weight: 8,  re: /\b(holiday|chhutti|छुट्टी|holidays|bank holiday|national holiday|avkash|अवकाश|sunrise|sunset|suryodaya|सूर्योदय|suryast|सूर्यास्त)\b/i },

  // NEWS
  { cat: 'news', weight: 10, re: /\b(news|khabar|खबर|samachar|समाचार|taaza|ताजा|latest|breaking|headlines|aaj ki khabar|taza khabar|india news|rewa news|mp news|rashtra|rajya)\b/i },
  { cat: 'news', weight: 7,  re: /\b(reddit|trending|viral|social media|charcha|चर्चा|hackernews|tech news|startup|silicon)\b/i },

  // FINANCE
  { cat: 'finance', weight: 10, re: /\b(share|शेयर|stock|market|nse|bse|sensex|nifty|mutual fund|sip|crypto|bitcoin|btc|ethereum|eth|price|rate|rupee|dollar|exchange|currency|forex|invest|paisa)\b/i },
  { cat: 'finance', weight: 8,  re: /\b(petrol|diesel|gold|silver|sona|चाँदी|commodity|crude oil|interest rate|emi|loan|bank rate)\b/i },

  // KNOWLEDGE / WIKI
  { cat: 'knowledge', weight: 8, re: /\b(kaun hai|कौन है|kya hai|क्या है|who is|what is|batao|बताओ|jaankari|जानकारी|information|history|itihas|इतिहास|explain|define|wikipedia|meaning|matlab|मतलब|definition|translate|anuvad|अनुवाद)\b/i },
  { cat: 'knowledge', weight: 6, re: /\b(book|kitaab|किताब|novel|author|lekhak|लेखक|isbn|read|padna|पढ़ना)\b/i },

  // LOCATION
  { cat: 'location', weight: 10, re: /\b(kahan hai|कहाँ है|where is|location|address|nearby|pass mein|पास में|dhundho|ढूंढो|naksha|नक्शा|map|directions|distance|kitni door|kitne km)\b/i },
  { cat: 'location', weight: 8,  re: /\b(pincode|पिनकोड|postal|zip|post office|dak ghar|डाकघर|area code|district|city)\b/i },

  // INDIA SPECIFIC
  { cat: 'india', weight: 10, re: /\b(train|rail|railway|irctc|pnr|ticket|reservation|रेलवे|गाड़ी|ट्रेन|aadhaar|pan card|digilocker|neet|jee|upsc|sarkari|government|yojana|scheme|subsidy|ration card)\b/i },
  { cat: 'india', weight: 8,  re: /\b(rewa|रीवा|madhya pradesh|mp|india|bharat|भारत|desh|देश|cm|pm|modi|bjp|congress|election|vote|chunav)\b/i },

  // EDUCATION
  { cat: 'education', weight: 10, re: /\b(physics|chemistry|biology|math|maths|science|formula|equation|theory|concept|NEET|JEE|CBSE|class 11|class 12|ncert|chapter|numericals|derivation|proof|theorem|integral|derivative|organic|inorganic|cell|dna|evolution|force|energy|reaction|element|periodic|atom|molecule)\b/i },
  { cat: 'education', weight: 7,  re: /\b(study|padhai|पढ़ाई|exam|test|quiz|mcq|notes|revision|syllabus|topic|explain karo|samjhao|समझाओ)\b/i },

  // ENTERTAINMENT
  { cat: 'entertainment', weight: 10, re: /\b(movie|film|web series|netflix|amazon prime|hotstar|youtube|video|song|gaana|गाना|music|sangeet|संगीत|watch|dekhna|देखना|trailer|release|bollywood|hollywood|actor|actress|director|imdb|rating|review|serial|episode)\b/i },
  { cat: 'entertainment', weight: 7,  re: /\b(bhajan|गाने|playlist|album|artist|genre|trending song|new song|naya gaana)\b/i },


  // ANDROID CONTROL
  { cat: 'android', weight: 12, re: /\b(open|launch|start|kholo|chalu karo|chalao)\s+(youtube|instagram|whatsapp|telegram|spotify|camera|maps|gmail|calendar|settings|chrome|netflix|phone|messages|play|paytm|gpay|phonepe|zomato|swiggy|flipkart|amazon|hotstar|gaana|irctc|jio|ola|uber)\b/i },
  { cat: 'android', weight: 12, re: /\b(wifi|bluetooth|torch|flashlight|brightness|volume|screenshot|screen shot)\s*(on|off|toggle|chalu|band|set|kar|karo)\b/i },
  { cat: 'android', weight: 12, re: /\b(call karo|phone karo|call|dial)\s+[\d+]/i },
  { cat: 'android', weight: 11, re: /\b(alarm\s*(?:laga|set|baja)|wake me|mujhe jagao)\s+/i },
  { cat: 'android', weight: 10, re: /\b(macrodroid|android\s*control|phone\s*control|system\s*control)\b/i },

  // IMAGE GENERATION
  { cat: 'image_gen', weight: 10, re: /\b(image|तस्वीर|photo|generate|banao|बनाओ|create picture|draw|art|design|photo|चित्र|wallpaper|poster|illustration|render|ai image|generate image|photo banana)\b/i },

  // PRODUCTIVITY
  { cat: 'productivity', weight: 9, re: /\b(reminder|याद दिलाना|alarm|schedule|calendar|task|todo|list|note|save this|yad raho|kal yaad karna|set alarm|remind me|schedule karo)\b/i },
  { cat: 'productivity', weight: 7, re: /\b(calculate|compute|math|solve|equals|answer|result|जोड़|घटाओ|गुणा|भाग|percent|percentage|addition|subtraction)\b/i },

  // SCIENCE
  { cat: 'science', weight: 9, re: /\b(nasa|space|अंतरिक्ष|planet|ग्रह|asteroid|mars|मंगल|moon|चाँद|galaxy|star|तारा|cosmos|orbit|ISS|space station|satellite|telescope|hubble|black hole)\b/i },

  // HEALTH
  { cat: 'health', weight: 10, re: /\b(health|sehat|सेहत|doctor|medicine|dawa|दवा|symptoms|bimari|बीमारी|treatment|hospital|bmi|weight|calorie|diet|nutrition|exercise|yoga|ayurvedic|blood pressure|sugar|diabetes|fever|cold|headache|pain)\b/i },

  // SPORTS
  { cat: 'sports', weight: 10, re: /\b(cricket|ipl|cricket match|score|match|team|player|captain|wicket|run|century|virat|rohit|test match|odi|t20|football|fifa|isl|kho kho|kabaddi|badminton|tennis|hockey|chess)\b/i },

  // FOOD
  { cat: 'food', weight: 9, re: /\b(recipe|रेसिपी|khana|खाना|cook|banana|dish|food|ingredients|samgri|biryani|dal|sabzi|roti|dosa|idli|pulao|dessert|sweet|mithai|chai|coffee|restaurant|dhaba|order food)\b/i },

  // FUN
  { cat: 'fun', weight: 8, re: /\b(joke|जोक|funny|mazak|मजाक|hansao|हंसाओ|comedy|chutkula|चुटकुला|laugh|hasna|entertainment|shayari|poem|kavita|quote|inspiration|motivate|attitude)\b/i },

  // TRAVEL
  { cat: 'travel', weight: 10, re: /\b(travel|yatra|यात्रा|tour|trip|flight|bus|hotel|booking|visa|passport|tourism|destination|kahan jana|kahaan jaao|ghumna|घूमना|holiday trip|best place|best city)\b/i },

  // CODE
  { cat: 'code', weight: 9, re: /\b(code|programming|python|javascript|typescript|react|nextjs|algorithm|function|bug|error|debug|api|github|replit|git|sql|database|html|css|component|deploy|server|backend|frontend)\b/i },

  // SEARCH (generic — lowest priority)
  { cat: 'search', weight: 3, re: /\b(search|dhundho|find|batao|google|web|internet|online|result|information about)\b/i },
]

// ── Chitchat / pure math patterns (skip tools) ────────────
const SKIP_TOOLS_RE = /^(hi|hello|hey|hii|how are you|kya haal|theek ho|kaise ho|good morning|good night|shubh|shukriya|thanks|thank you|dhanyawad|ok|okay|haan|nahi|no|yes|bilkul|sure|acha|accha|got it|samajh gaya|lol|haha|hmm|ok bhai|thik hai|[0-9 +\-*\/^()%.=]+$)/i

// ── Arg extractor (pre-fill tool params from query) ───────
function extractArgs(query: string): Record<string, string> {
  const args: Record<string, string> = {}
  const q = query.toLowerCase()

  // Location: city name after keywords
  const cityMatch = query.match(/(?:in|at|for|of|ke liye|mein|ka mausam|city)\s+([A-Z][a-zA-Z\s]+?)(?:\s+ka|\s+mein|\s+ka|\?|$)/i)
  if (cityMatch) args.location = cityMatch[1].trim()

  // Pincode: 6-digit number
  const pinMatch = query.match(/\b([1-9][0-9]{5})\b/)
  if (pinMatch) args.pincode = pinMatch[1]

  // PNR: 10-digit number
  const pnrMatch = query.match(/\b([0-9]{10})\b/)
  if (pnrMatch) args.pnr = pnrMatch[1]

  // Crypto
  const cryptoMatch = q.match(/\b(bitcoin|btc|ethereum|eth|bnb|dogecoin|doge|solana|sol|xrp|cardano|ada|litecoin|ltc|usdt|usdc)\b/)
  if (cryptoMatch) args.coin = cryptoMatch[1]

  // Currency
  const currMatch = q.match(/\b(usd|eur|gbp|jpy|cad|aud|chf|inr|dollar|euro|pound|yen|rupee)\b/i)
  if (currMatch) args.currency = currMatch[1]

  // Subreddit
  const subMatch = q.match(/r\/([a-zA-Z0-9_]+)/)
  if (subMatch) args.subreddit = subMatch[1]

  // Wikipedia query: what after "kya hai/who is"
  const wikiMatch = query.match(/(?:kya hai|kaun hai|what is|who is|about|ke baare mein)\s+(.{3,50})(?:\?|$)/i)
  if (wikiMatch) args.query = wikiMatch[1].trim()

  // Stock symbol (2-5 uppercase letters)
  const stockMatch = query.match(/\b([A-Z]{2,5})(?:\s+stock|\s+share|\s+price)/)
  if (stockMatch) args.symbol = stockMatch[1]

  return args
}

// ── Main intent detector ──────────────────────────────────
export function detectIntent(query: string): IntentResult {
  if (!query?.trim()) return { categories: ['none'], confidence: 0, extractedArgs: {}, maxTools: 0, skipTools: true, reason: 'empty' }

  // Check for pure chitchat/math — skip tools entirely
  if (SKIP_TOOLS_RE.test(query.trim()) && query.trim().length < 40) {
    return { categories: ['none'], confidence: 0, extractedArgs: {}, maxTools: 0, skipTools: true, reason: 'chitchat' }
  }

  // Score all categories
  const scores: Partial<Record<ToolCategory, number>> = {}
  for (const p of PATTERNS) {
    if (p.re.test(query)) {
      scores[p.cat] = (scores[p.cat] || 0) + p.weight
    }
  }

  // Sort by score
  const sorted = (Object.entries(scores) as [ToolCategory, number][])
    .sort((a, b) => b[1] - a[1])

  if (sorted.length === 0) {
    // No tool match → let AI answer directly
    return { categories: ['none'], confidence: 0, extractedArgs: {}, maxTools: 0, skipTools: true, reason: 'no_match' }
  }

  const topScore = sorted[0][1]
  const confidence = Math.min(topScore / 20, 1)

  // Low confidence (< 0.25) → skip tools, let AI answer
  if (confidence < 0.25) {
    return { categories: sorted.map(s => s[0]).slice(0, 2), confidence, extractedArgs: {}, maxTools: 0, skipTools: true, reason: 'low_confidence' }
  }

  // Determine how many tools (max 2)
  // Use 2 tools only if second category has >= 60% of top score
  const useTwo = sorted.length >= 2 && sorted[1][1] >= topScore * 0.6

  return {
    categories: sorted.map(s => s[0]).slice(0, 3),
    confidence,
    extractedArgs: extractArgs(query),
    maxTools: useTwo ? 2 : 1,
    skipTools: false,
    reason: `matched:${sorted.slice(0, 2).map(s => `${s[0]}(${s[1]})`).join(',')}`,
  }
}

// ── Fast category check (for routing, no full detection) ──
export function quickCategory(query: string): ToolCategory {
  const result = detectIntent(query)
  return result.categories[0] || 'none'
}
