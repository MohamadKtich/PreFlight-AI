import type {
  PreflightBrief,
  PreflightSearchResponse,
  PreflightVideoEvidence,
} from "@workspace/api-zod";

const ORIANE_SEARCH_URL =
  "https://connect.oriane.xyz/rest/contents/search?offset=0&limit=30&projection=full";
const MAX_INTENTS = 5;
const MAX_SCORING_EVIDENCE = 8;
const MAX_LOW_EVIDENCE = 8;
const MAX_UNSCORED_RELEVANT = 8;

type OrianeRecord = Record<string, unknown>;

const CATEGORY_GROUPS = [
  {
    label: "Running footwear",
    tokens: ["shoe", "shoes", "footwear", "sneaker", "sneakers", "trainer", "trainers"],
    search: "running shoes",
  },
  {
    label: "Skincare",
    tokens: ["skincare", "skin", "moisturizer", "moisturiser", "serum", "cleanser", "cream", "lotion"],
    search: "skincare",
  },
  {
    label: "Fashion",
    tokens: ["fashion", "clothing", "outfit", "style", "apparel"],
    search: "fashion",
  },
  {
    label: "Fitness",
    tokens: ["fitness", "workout", "exercise", "training", "gym"],
    search: "fitness",
  },
  {
    label: "Food and beverage",
    tokens: ["food", "recipe", "meal", "drink", "beverage", "restaurant"],
    search: "food",
  },
  {
    label: "Travel",
    tokens: ["travel", "trip", "destination", "hotel", "tourism"],
    search: "travel",
  },
  {
    label: "Technology",
    tokens: ["technology", "tech", "phone", "app", "software", "device"],
    search: "technology",
  },
  {
    label: "Automotive",
    tokens: ["automotive", "car", "vehicle", "motorcycle", "driving"],
    search: "automotive",
  },
  {
    label: "Creator tools",
    tokens: ["creator", "editing", "camera", "microphone", "filming"],
    search: "creator tools",
  },
];

const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "also", "am", "an",
  "and", "any", "are", "as", "at", "audience", "be", "because", "been", "before",
  "being", "below", "between", "both", "brand", "but", "by", "campaign", "can", "consumers",
  "could", "creator", "did", "do", "does", "doing", "down", "during", "each",
  "education", "explains", "for", "from", "further", "goal", "had", "has", "have",
  "he", "her", "here", "hers", "him", "his", "how", "i", "if", "in", "into",
  "is", "it", "its", "itself", "just", "launch", "me", "more", "most", "my",
  "new", "no", "nor", "not", "of", "off", "on", "once", "only", "opens", "or",
  "other", "our", "out", "over", "own", "people", "product", "same", "she",
  "should", "so", "some", "solution", "such", "target", "than", "that", "the",
  "their", "them", "then", "there", "these", "they", "this", "those", "through",
  "to", "too", "under", "until", "up", "very", "video", "was", "we", "were",
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "what", "when", "where", "which", "while", "who", "whom", "why", "will",
  "with", "would", "you", "your", "young", "test", "tests", "testing",
]);

const RUN_WORDS = new Set(["run", "runs", "running", "runner", "runners", "jog", "jogs", "jogging"]);
const FOOTWEAR_WORDS = new Set(["shoe", "shoes", "footwear", "sneaker", "sneakers", "trainer", "trainers"]);
const BUSINESS_NEWS_WORDS = new Set([
  "stock", "stocks", "investor", "investors", "shareholder", "billion", "earnings",
  "revenue", "valuation", "nasdaq", "dow", "financial", "finance", "trading", "traded",
]);

export class OrianeSearchError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
    this.name = "OrianeSearchError";
  }
}

function words(value: string): string[] {
  return [...new Set(
    (value.toLowerCase().match(/[\p{L}][\p{L}\p{N}-]*/gu) ?? [])
      .filter((word) => word.length >= 3 && !STOP_WORDS.has(word)),
  )];
}

function isRecord(value: unknown): value is OrianeRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function metric(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value : undefined;
}

function httpsUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function explicitVideoUrl(record: OrianeRecord, platform: string): string | undefined {
  const platformName = platform.toLowerCase();
  const trustedDomains = platformName.includes("instagram") ? ["instagram.com"]
    : platformName.includes("tiktok") ? ["tiktok.com"]
      : platformName.includes("youtube") ? ["youtube.com", "youtu.be"]
        : platformName.includes("facebook") ? ["facebook.com", "fb.watch"]
          : platformName === "x" || platformName.includes("twitter") ? ["x.com", "twitter.com"]
            : platformName.includes("snapchat") ? ["snapchat.com"]
              : platformName.includes("pinterest") ? ["pinterest.com"]
                : platformName.includes("twitch") ? ["twitch.tv"]
                  : [];
  const candidates = [
    record.originalVideoUrl, record.originalVideoURL, record.videoUrl, record.videoURL,
    record.permalink, record.contentUrl, record.externalUrl, record.sourceUrl,
    record.platformUrl, record.url,
  ];
  for (const raw of candidates) {
    const verifiedUrl = httpsUrl(raw);
    if (!verifiedUrl) continue;
    const url = new URL(verifiedUrl);
    const hostname = url.hostname.toLowerCase();
    if (!trustedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) continue;
    // A creator profile or platform homepage is not an original video.
    if (platformName.includes("instagram") && !/^\/(?:reel|p|tv)\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)) continue;
    if (platformName.includes("tiktok") && !/^\/@[^/]+\/video\/\d+\/?$/.test(url.pathname)) continue;
    return verifiedUrl;
  }
  return undefined;
}

const originalUrlCache = new Map<string, { url?: string; expiresAt: number }>();

async function verifyInstagramOriginal(shortcode: string): Promise<string | undefined> {
  try {
    const response = await fetch(`https://www.instagram.com/reel/${shortcode}/`, {
      redirect: "manual",
      signal: AbortSignal.timeout(4_000),
      headers: { Accept: "text/html" },
    });
    if (response.status !== 200 || !response.headers.get("content-type")?.includes("text/html")) return undefined;
    if (Number(response.headers.get("content-length")) > 1_500_000) return undefined;
    const html = await response.text();
    if (html.length > 1_500_000 ||
      !/<meta\s+property="og:title"\s+content=/i.test(html) ||
      !/<meta\s+property="og:image"\s+content=/i.test(html)) return undefined;

    const canonicalText = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
    const originalText = html.match(/<meta\s+property="og:url"\s+content="([^"]+)"/i)?.[1];
    if (!canonicalText || !originalText) return undefined;
    const canonical = new URL(canonicalText);
    const original = new URL(originalText);
    if (![canonical, original].every(url => url.protocol === "https:" &&
      (url.hostname === "instagram.com" || url.hostname === "www.instagram.com"))) return undefined;
    const canonicalParts = canonical.pathname.match(/^\/(reel|p|tv)\/([A-Za-z0-9_-]+)\/?$/);
    const originalParts = original.pathname.match(/^\/(?:[^/]+\/)?(reel|p|tv)\/([A-Za-z0-9_-]+)\/?$/);
    if (!canonicalParts || !originalParts ||
      canonicalParts[1] !== originalParts[1] ||
      canonicalParts[2] !== shortcode || originalParts[2] !== shortcode) return undefined;
    return canonical.toString();
  } catch {
    return undefined;
  }
}

async function verifyTikTokOriginal(platformId: string, handle: string): Promise<string | undefined> {
  const candidate = `https://www.tiktok.com/@${handle}/video/${platformId}`;
  try {
    const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(candidate)}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(4_000),
      headers: { Accept: "application/json" },
    });
    // A 200 HTML page or a redirect to TikTok's generic About page does not verify a video.
    if (response.status !== 200 || !response.headers.get("content-type")?.includes("application/json")) return undefined;
    const payload: unknown = await response.json();
    if (!isRecord(payload) || payload.type !== "video" ||
      text(payload.provider_name)?.toLowerCase() !== "tiktok" ||
      typeof payload.html !== "string") return undefined;
    const authorUrl = httpsUrl(payload.author_url);
    const cite = payload.html.match(/\bcite="([^"]+)"/i)?.[1];
    if (!authorUrl || !cite || !payload.html.includes(`data-video-id="${platformId}"`)) return undefined;
    const author = new URL(authorUrl);
    const cited = new URL(cite);
    if (author.hostname !== "www.tiktok.com" && author.hostname !== "tiktok.com") return undefined;
    if (cited.hostname !== "www.tiktok.com" && cited.hostname !== "tiktok.com") return undefined;
    if (author.pathname.toLowerCase() !== `/@${handle.toLowerCase()}` ||
      cited.pathname.toLowerCase() !== `/@${handle.toLowerCase()}/video/${platformId}`) return undefined;
    return candidate;
  } catch {
    return undefined;
  }
}

async function resolveOriginalUrl(record: OrianeRecord): Promise<string | undefined> {
  const platform = text(record.platform) ?? "";
  const direct = explicitVideoUrl(record, platform);
  if (direct) return direct;

  const platformId = text(record.platformId);
  const handle = text(record.profileHandle)?.replace(/^@/, "");
  if (!platformId) return undefined;
  const instagram = platform.toLowerCase().includes("instagram") && /^[A-Za-z0-9_-]{5,24}$/.test(platformId);
  const tiktok = platform.toLowerCase().includes("tiktok") &&
    /^\d{15,22}$/.test(platformId) && !!handle && /^[A-Za-z0-9._]{2,24}$/.test(handle);
  if (!instagram && !tiktok) return undefined;

  const key = `${platform.toLowerCase()}:${platformId}:${handle ?? ""}`;
  const cached = originalUrlCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  const url = instagram
    ? await verifyInstagramOriginal(platformId)
    : await verifyTikTokOriginal(platformId, handle!);
  if (originalUrlCache.size > 500) originalUrlCache.clear();
  originalUrlCache.set(key, { url, expiresAt: Date.now() + (url ? 30 : 2) * 60_000 });
  return url;
}

function phrasePresent(searchable: string, phrase: string): boolean {
  const normalized = phrase.toLowerCase().trim();
  if (!normalized) return false;
  return new RegExp(`(^|[^\\p{L}\\p{N}])${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}\\p{N}]|$)`, "u").test(searchable);
}

function tokenList(value: string): string[] {
  return value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

function nearbyPair(value: string, leftWords: Set<string>, rightWords: Set<string>, distance = 5): boolean {
  const tokens = tokenList(value);
  for (let left = 0; left < tokens.length; left += 1) {
    if (!leftWords.has(tokens[left])) continue;
    const end = Math.min(tokens.length, left + distance + 1);
    for (let right = left + 1; right < end; right += 1) {
      if (rightWords.has(tokens[right])) return true;
    }
  }
  return false;
}

function hasRunningFootwearContext(caption: string, openingTranscript: string): boolean {
  return [caption, openingTranscript].some((part) =>
    nearbyPair(part, FOOTWEAR_WORDS, RUN_WORDS) ||
    nearbyPair(part, RUN_WORDS, FOOTWEAR_WORDS),
  );
}

function hasSkincareProductContext(caption: string, openingTranscript: string): boolean {
  return [caption, openingTranscript].some((part) => {
    const normalized = part.toLowerCase().replace(/[-_]/g, " ");
    const tokens = tokenList(normalized);
    const explicitProducts = new Set(["moisturizer", "moisturiser", "serum", "cleanser", "sunscreen", "spf", "acne"]);
    const specificProduct = tokens.some((token) => explicitProducts.has(token));
    const topicalCream = nearbyPair(normalized, new Set(["skin", "face", "facial"]), new Set(["cream", "lotion"])) ||
      nearbyPair(normalized, new Set(["cream", "lotion"]), new Set(["skin", "face", "facial"]));
    const fragranceOnly = tokens.some((token) => token === "perfume" || token === "fragrance") &&
      !specificProduct && !topicalCream;
    if (fragranceOnly) return false;
    return phrasePresent(normalized, "skincare") ||
      phrasePresent(normalized, "skin care") ||
      specificProduct ||
      topicalCream;
  });
}

function categoryContext(
  category: ReturnType<typeof planSearch>["category"],
  caption: string,
  openingTranscript: string,
) {
  if (!category) return { matched: false, terms: [] as string[] };
  if (category.label === "Running footwear") {
    const matched = hasRunningFootwearContext(caption, openingTranscript);
    return { matched, terms: matched ? ["running footwear context"] : [] };
  }
  if (category.label === "Skincare") {
    const matched = hasSkincareProductContext(caption, openingTranscript);
    return { matched, terms: matched ? ["skincare product context"] : [] };
  }
  const matchedTerms = category.tokens.filter((token) =>
    phrasePresent(`${caption} ${openingTranscript}`.toLowerCase(), token),
  );
  return { matched: matchedTerms.length > 0, terms: matchedTerms };
}

function planSearch(brief: PreflightBrief) {
  const audience = words(brief.audience);
  const brand = brief.brand.trim();
  const brandTerms = new Set(words(brand));
  const concept = words(brief.concept).filter((word) => !brandTerms.has(word));
  const briefWords = new Set([...audience, ...concept]);
  const category = CATEGORY_GROUPS.find((group) =>
    group.tokens.some((token) => briefWords.has(token)),
  );
  const categoryTokens = category?.tokens ?? [];
  const locations = words(brief.market);
  const audienceTerms = audience.filter((word) =>
    !categoryTokens.includes(word) && !brandTerms.has(word),
  ).slice(0, 2);
  const hookTerms = concept.filter((word) =>
    !categoryTokens.includes(word) && !locations.includes(word) &&
    !brandTerms.has(word) &&
    !["runner", "runners", "run", "running", "night"].includes(word),
  ).slice(0, 3);
  const conceptContext = concept.filter((word) =>
    ["night", "morning", "street", "city", "home", "outdoor", "outdoors", "beach", "dubai", "uae"].includes(word),
  ).slice(0, 2);
  const categorySearch = category?.search ?? concept.slice(0, 2).join(" ");
  const market = brief.market.trim();

  const candidates = [
    `${brand} ${categorySearch}`,
    `${categorySearch} ${hookTerms.slice(0, 2).join(" ")}`.trim(),
    `${categorySearch} ${audienceTerms.join(" ")}`.trim(),
    [conceptContext.join(" "), locations.slice(0, 2).join(" "), categorySearch].filter(Boolean).join(" "),
    `${brand} ${hookTerms.join(" ")}`.trim(),
  ];
  const intents = [...new Set(candidates
    .map((intent) => intent.replace(/\s+/g, " ").trim())
    .filter((intent) => words(intent).length >= 2))]
    .slice(0, MAX_INTENTS);

  return {
    brand,
    market,
    conceptText: brief.concept,
    audience,
    concept,
    category,
    intents: intents.length > 0 ? intents : [`${brand} ${market}`.trim()],
  };
}

function requestBody(intent: string) {
  return {
    name: "preflight-focused-evidence",
    operator: "and",
    filters: { format: { includes: ["video"], operator: "and" } },
    queries: [{
      name: "focused-brief-intent",
      operator: "or",
      filters: {
        caption: { includesFuzzy: { values: [intent], operator: "or" }, operator: "and" },
        transcript: { includesFuzzy: { values: [intent], operator: "or" }, operator: "and" },
      },
    }],
  };
}

async function searchIntent(intent: string, key: string): Promise<OrianeRecord[]> {
  let response: Response;
  try {
    response = await fetch(ORIANE_SEARCH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody(intent)),
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    throw new OrianeSearchError("Oriane request timed out or could not be reached");
  }
  if (!response.ok) throw new OrianeSearchError("Oriane rejected the search", response.status);

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new OrianeSearchError("Oriane returned invalid JSON");
  }
  if (!isRecord(payload) || !isRecord(payload.data) || !Array.isArray(payload.data.results)) {
    throw new OrianeSearchError("Oriane returned an unexpected result shape");
  }
  return payload.data.results.filter(
    (result): result is OrianeRecord => isRecord(result) && !!text(result.id),
  );
}

function assessRelevance(record: OrianeRecord, plan: ReturnType<typeof planSearch>) {
  const caption = text(record.caption) ?? "";
  const transcript = text(record.transcript) ?? "";
  const subjectCaption = caption.slice(0, 500);
  const openingTranscript = transcript.slice(0, 180);
  const searchable = `${subjectCaption} ${openingTranscript}`.toLowerCase();
  const brandMatched = phrasePresent(searchable, plan.brand);
  const categoryMatch = categoryContext(plan.category, subjectCaption, openingTranscript);
  const matchedCategoryTerms = categoryMatch.terms;
  const categoryMatched = categoryMatch.matched;
  const matchedConceptTerms = [...new Set(plan.concept.filter((word) =>
    !plan.category?.tokens.includes(word) && phrasePresent(searchable, word),
  ))];
  const matchedAudienceTerms = [...new Set(plan.audience.filter((word) =>
    phrasePresent(searchable, word),
  ))];
  const marketMatched = phrasePresent(searchable, plan.market) ||
    [text(record.locationCompleteAddress), text(record.profileLocationCompleteAddress)]
      .some((location) => !!location && phrasePresent(location.toLowerCase(), plan.market));
  const businessNews = tokenList(searchable).some((token) => BUSINESS_NEWS_WORDS.has(token));

  let score = 0;
  const reasons: string[] = [];
  if (brandMatched) {
    score += 22;
    reasons.push(`Exact brand name appears in the caption/opening: ${plan.brand}.`);
  }
  if (categoryMatched) {
    score += 40;
    reasons.push(`Genuine product/category context appears near the subject: ${matchedCategoryTerms.join(", ")}.`);
  } else if (plan.category) {
    reasons.push(`No qualifying ${plan.category.label.toLowerCase()} product/category context appears in the caption/opening.`);
  }
  const conceptPoints = Math.min(20, matchedConceptTerms.length * 4);
  score += conceptPoints;
  if (matchedConceptTerms.length) {
    reasons.push(`Brief concept wording appears in the caption/opening: ${matchedConceptTerms.slice(0, 3).join(", ")}.`);
  }
  if (matchedAudienceTerms.length) {
    score += Math.min(5, matchedAudienceTerms.length * 2);
    reasons.push(`Brief context wording appears: ${matchedAudienceTerms.slice(0, 2).join(", ")}.`);
  }
  if (marketMatched) {
    score += 5;
    reasons.push("Market/location wording appears in the caption/opening or source location fields.");
  }

  // Category context is mandatory: distant brand mentions, generic runner
  // records, and business/news stories cannot qualify on keyword overlap alone.
  const qualifies = !businessNews && (plan.category
    ? categoryMatched && (brandMatched || matchedConceptTerms.length > 0 || marketMatched)
    : brandMatched && matchedConceptTerms.length >= 2);
  if (businessNews) reasons.push("Business/news subject matter is not comparable creative evidence.");
  if (!qualifies) {
    score = Math.min(score, 34);
    reasons.push("Insufficient product/category evidence to qualify for scoring.");
  }
  score = Math.max(0, Math.min(100, Math.round(score)));

  const level = qualifies && score >= 62 ? "high"
    : qualifies && score >= 38 ? "medium"
      : "low";
  const opening = `${caption.slice(0, 360)} ${openingTranscript}`.toLowerCase();
  const conceptHasNumberedMistakes = /\bmistakes?\b/i.test(plan.conceptText) &&
    /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i.test(plan.conceptText);
  const openingHasNumberedMistakes =
    /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b(?:\s+\w+){0,2}\s+mistakes?\b/i.test(opening);
  let openingPattern: string | undefined;
  if (conceptHasNumberedMistakes && openingHasNumberedMistakes) {
    openingPattern = "Numbered mistakes";
  } else if (
    plan.category?.label === "Running footwear" &&
    /\b(?:test(?:s|ing|ed)?|demo(?:nstrat(?:e|ing|ed))?|review|try|trying|tried)\b/i.test(plan.conceptText) &&
    hasRunningFootwearContext(caption.slice(0, 360), openingTranscript) &&
    /\b(?:test(?:s|ing|ed)?|demo(?:nstrat(?:e|ing|ed))?|review|try|trying|tried)\b/i.test(opening)
  ) {
    openingPattern = "Running footwear product test";
  }
  if (reasons.length === 0) reasons.push("No direct brief-specific wording found in caption or transcript.");
  return {
    score,
    level,
    reasons,
    brandMatched,
    categoryMatched,
    matchedCategoryTerms,
    matchedConceptTerms,
    matchedAudienceTerms,
    marketMatched,
    comparableOpening: !!openingPattern,
    openingPattern,
  } as const;
}

function normalize(
  record: OrianeRecord,
  plan: ReturnType<typeof planSearch>,
  assessment: ReturnType<typeof assessRelevance>,
  usedForScoring: boolean,
  capExcluded = false,
  resolvedUrl?: string,
): PreflightVideoEvidence {
  const platform = text(record.platform) ?? "Unknown";
  const handle = text(record.profileHandle);
  const id = text(record.id)!;
  const platformId = text(record.platformId);
  const rate = metric(record.engagementRatePerViews);
  const publishedAt = text(record.publishedAt);
  const categoryName = plan.category?.label ?? "Brief-specific category";
  const supportedFactors = [
    assessment.brandMatched ? `brand ${plan.brand}` : undefined,
    assessment.categoryMatched ? `category terms ${assessment.matchedCategoryTerms.slice(0, 3).join(", ")}` : undefined,
    assessment.matchedConceptTerms.length
      ? `concept terms ${assessment.matchedConceptTerms.slice(0, 3).join(", ")}` : undefined,
    assessment.matchedAudienceTerms.length
      ? `brief-context terms ${assessment.matchedAudienceTerms.slice(0, 2).join(", ")}` : undefined,
    assessment.marketMatched ? `market/location ${plan.market}` : undefined,
  ].filter((factor): factor is string => !!factor);
  const relevanceReasons = capExcluded
    ? [...assessment.reasons, "Relevant record not used because the top-8 scoring limit was reached."]
    : assessment.reasons;

  return {
    id,
    creator: text(record.profileDisplayName) ?? (handle ? `@${handle}` : undefined),
    profileHandle: handle,
    platform: platform[0].toUpperCase() + platform.slice(1),
    platformId,
    publishDate: publishedAt?.slice(0, 10),
    views: metric(record.viewsCount),
    likes: metric(record.likesCount),
    comments: metric(record.commentsCount),
    shares: metric(record.sharesCount),
    // Oriane supplies engagementRatePerViews in percentage points (e.g. 1.09 means 1.09%).
    engagementRate: rate === undefined ? undefined : Math.round(rate * 10) / 10,
    language: text(record.transcriptLanguage) ?? text(record.captionLanguage),
    caption: text(record.caption),
    transcript: text(record.transcript),
    thumbnailUrl: httpsUrl(record.thumbnailMediaUrl),
    videoUrl: resolvedUrl ?? explicitVideoUrl(record, platform),
    relevanceScore: assessment.score,
    relevanceLevel: assessment.level,
    usedForScoring,
    relevanceReasons,
    source: "live-oriane",
    sourceLabel: "LIVE ORIANE EVIDENCE",
    sourceNote: `Oriane indexed ${platform} video · Oriane content ID ${id}${platformId ? ` · Platform content ID ${platformId}` : ""}.`,
    match: {
      category: categoryName,
      hook: assessment.comparableOpening
        ? `Hook wording: ${assessment.openingPattern}`
        : "Hook wording not established",
      format: "Video",
      comparableOpening: assessment.comparableOpening,
      openingPattern: assessment.openingPattern,
      supported: supportedFactors.length
        ? `Observed caption/transcript or source-location matches: ${supportedFactors.join("; ")}. These matches do not establish audience targeting.`
        : "No direct supported brand, product/category, concept, audience-context, or market match was observed.",
    },
  };
}

export async function searchOriane(brief: PreflightBrief): Promise<PreflightSearchResponse> {
  const key = process.env.ORIANE_API_KEY;
  if (!key) throw new OrianeSearchError("Oriane API key is not configured");

  const plan = planSearch(brief);
  const results = await Promise.allSettled(plan.intents.map((intent) => searchIntent(intent, key)));
  const successful = results.filter(
    (result): result is PromiseFulfilledResult<OrianeRecord[]> => result.status === "fulfilled",
  );
  if (successful.length === 0) {
    const failed = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
    const cause = failed?.reason;
    throw cause instanceof OrianeSearchError
      ? cause
      : new OrianeSearchError("Oriane search failed");
  }

  const unique = new Map<string, OrianeRecord>();
  for (const result of successful) {
    for (const record of result.value) {
      const id = text(record.id);
      if (id && !unique.has(id)) unique.set(id, record);
    }
  }
  const ranked = [...unique.values()]
    .map((record) => ({ record, assessment: assessRelevance(record, plan) }))
    .sort((left, right) =>
      right.assessment.score - left.assessment.score ||
      String(left.record.id).localeCompare(String(right.record.id)),
    );
  const relevant = ranked.filter(({ assessment }) => assessment.level !== "low");
  const low = ranked.filter(({ assessment }) => assessment.level === "low");
  const scoringRows = relevant.slice(0, MAX_SCORING_EVIDENCE);
  const supportingRows = relevant.slice(MAX_SCORING_EVIDENCE, MAX_SCORING_EVIDENCE + MAX_UNSCORED_RELEVANT);
  const lowRows = low.slice(0, MAX_LOW_EVIDENCE);
  const selectedRows = [...scoringRows, ...supportingRows, ...lowRows];
  const verifiedUrls = new Map<string, string>();
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, selectedRows.length) }, async () => {
    while (next < selectedRows.length) {
      const { record } = selectedRows[next++];
      const url = await resolveOriginalUrl(record);
      if (url) verifiedUrls.set(text(record.id)!, url);
    }
  }));
  const scoring = scoringRows.map(({ record, assessment }) =>
    normalize(record, plan, assessment, true, false, verifiedUrls.get(text(record.id)!)),
  );
  const relevantBeyondCap = supportingRows
    .map(({ record, assessment }) => normalize(record, plan, assessment, false, true, verifiedUrls.get(text(record.id)!)));
  const excludedLow = lowRows.map(({ record, assessment }) =>
    normalize(record, plan, assessment, false, false, verifiedUrls.get(text(record.id)!)),
  );
  const excludedCount = low.length;
  const partial = successful.length < plan.intents.length;
  const evidence = [...scoring, ...relevantBeyondCap, ...excludedLow];

  return {
    source: "live-oriane",
    evidence,
    trace: {
      intents: plan.intents,
      retrieved: unique.size,
      used: scoring.length,
      excluded: excludedCount,
      capped: Math.max(0, relevant.length - scoring.length),
      displayed: evidence.length,
      ...(partial ? { partial: true } : {}),
    },
  };
}