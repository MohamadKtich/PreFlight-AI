export type CampaignGoal = 'Product Launch' | 'Awareness' | 'Conversion' | 'Education' | 'Creator Campaign';

export type Brief = {
  brand: string;
  market: string;
  audience: string;
  goal: CampaignGoal;
  concept: string;
};

export type VideoEvidence = {
  id: string;
  creator?: string;
  profileHandle?: string;
  platform?: string;
  platformId?: string;
  publishDate?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  engagementRate?: number;
  language?: string;
  caption?: string;
  transcript?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  source: 'demo-illustrative' | 'live-oriane';
  sourceLabel: 'TRAINING / ILLUSTRATIVE' | 'LIVE ORIANE EVIDENCE';
  sourceNote: string;
  relevanceScore?: number;
  relevanceLevel?: 'high' | 'medium' | 'low';
  usedForScoring?: boolean;
  relevanceReasons?: string[];
  match: {
    category: string;
    hook: string;
    format: string;
    supported: string;
    comparableOpening?: boolean;
    openingPattern?: string;
  };
};

export type Decomposition = {
  hookType: string;
  contentFormat: string;
  category: string;
  product: string;
  context: string;
  audience: string;
  problem: string;
  productRole: string;
  tone: string;
  expertStyle: string;
  ctaStyle: string;
  structure: string;
};

export type Signal = {
  name: 'Performance Signal' | 'Saturation Risk' | 'Hook Freshness' | 'Creator Diversity' | 'Evidence Strength';
  score: number;
  basis: string;
  direction?: 'positive' | 'risk';
};

export type Analysis = {
  source: 'demo-illustrative' | 'live-oriane';
  decomposition: Decomposition;
  signals: Signal[];
  score: number;
  decision: 'GO' | 'REVISE' | 'AVOID' | 'INCONCLUSIVE';
  evidence: VideoEvidence[];
  why: string[];
  trace?: SearchTrace;
};

export type SearchTrace = {
  intents: string[];
  retrieved: number;
  used: number;
  excluded: number;
  displayed?: number;
  capped?: number;
  partial?: boolean;
};

export const DEMO_BRIEF: Brief = {
  brand: 'CeraVe',
  market: 'UAE',
  audience: '18–30 skincare consumers',
  goal: 'Product Launch',
  concept: 'A dermatologist opens with “Three skincare mistakes that are ruining your skin,” explains the problem, and introduces the product as the solution.',
};

export const DISCLAIMER = 'PreFlight is an evidence-based creative heuristic, not a guaranteed performance prediction.';

const demoEvidence: VideoEvidence[] = [
  {
    id: 'demo-01',
    creator: 'Nour Al-Khatib',
    platform: 'TikTok',
    publishDate: '2024-05-14',
    views: 84200,
    likes: 6100,
    comments: 184,
    shares: 740,
    engagementRate: 8.3,
    language: 'English',
    caption: 'Three skincare mistakes I see every week — and what to do instead.',
    transcript: 'Three skincare mistakes I see every week. First, over-cleansing. Second, skipping moisturizer. Here is what to do instead.',
    source: 'demo-illustrative',
    sourceLabel: 'TRAINING / ILLUSTRATIVE',
    sourceNote: 'Demo record with illustrative metrics. Not a live platform result.',
    match: { category: 'skincare education', hook: 'numbered mistakes', format: 'list / direct-to-camera', supported: 'The supplied caption and transcript use a numbered mistakes hook and skincare education.' },
  },
  {
    id: 'demo-02',
    creator: 'Dr. Leila Mansour',
    platform: 'Instagram Reels',
    publishDate: '2024-06-02',
    views: 37600,
    likes: 2900,
    comments: 93,
    shares: 310,
    engagementRate: 8.8,
    language: 'English / Arabic',
    caption: 'Your barrier may be asking for less, not more.',
    transcript: 'Your barrier may be asking for less, not more. Look for a simple routine built around cleansing and hydration.',
    source: 'demo-illustrative',
    sourceLabel: 'TRAINING / ILLUSTRATIVE',
    sourceNote: 'Demo record with illustrative metrics. Not a live platform result.',
    match: { category: 'skincare education', hook: 'contrarian question', format: 'expert explainer', supported: 'The supplied transcript supports a barrier problem and expert-led education; it does not establish product performance.' },
  },
  {
    id: 'demo-03',
    creator: 'Maya Rahman',
    platform: 'YouTube Shorts',
    publishDate: '2024-04-27',
    views: 119000,
    likes: 9400,
    comments: 227,
    shares: 1200,
    engagementRate: 9.1,
    language: 'Arabic',
    caption: 'Stop copying routines that were never made for your skin.',
    transcript: 'Stop copying routines that were never made for your skin. Start with your skin concern, then choose the basics.',
    source: 'demo-illustrative',
    sourceLabel: 'TRAINING / ILLUSTRATIVE',
    sourceNote: 'Demo record with illustrative metrics. Not a live platform result.',
    match: { category: 'skincare education', hook: 'pattern interrupt', format: 'creator monologue', supported: 'The supplied caption supports a pattern interrupt about routines and the transcript supports audience relevance.' },
  },
];

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function decomposeConcept(brief: Brief): Decomposition {
  const concept = brief.concept.toLowerCase();
  const audience = brief.audience.toLowerCase();
  const allText = `${concept} ${audience}`;
  const isList = /\b(?:three|3|5|five|mistake|steps?|ways|tips?|list)\b/.test(concept);
  const isExpert = /\b(?:dermatologist|doctor|expert|specialist|coach|chef|mechanic)\b/.test(concept);
  const isProblemSolution = /\b(?:problem|mistake|ruin|solution|fix|instead|challenge|test)\b/.test(concept);
  const categories: { pattern: RegExp; label: string; product: string }[] = [
    { pattern: /\b(?:running shoes?|sneakers?|footwear|shoes?)\b/, label: 'Footwear', product: 'Performance footwear' },
    { pattern: /\b(?:fashion|apparel|clothing|outfit|wardrobe|style)\b/, label: 'Fashion', product: 'Apparel / style product' },
    { pattern: /\b(?:fitness|workout|gym|training|exercise|running|runner|runners|race)\b/, label: 'Fitness', product: 'Fitness / training offering' },
    { pattern: /\b(?:recipe|food|meal|snack|restaurant|cooking|drink|beverage)\b/, label: 'Food & beverage', product: 'Food or beverage product' },
    { pattern: /\b(?:travel|destination|hotel|trip|tourism|holiday)\b/, label: 'Travel', product: 'Travel experience / destination' },
    { pattern: /\b(?:skincare|skin care|dermatolog|skin barrier|moisturi[sz]er|cleanser)\b/, label: 'Skincare', product: 'Skincare product' },
    { pattern: /\b(?:beauty|makeup|cosmetic|haircare|hair care|fragrance)\b/, label: 'Beauty & personal care', product: 'Beauty / personal-care product' },
    { pattern: /\b(?:creator tool|content creation|video edit|editing app|camera|microphone|creator platform)\b/, label: 'Creator tools', product: 'Creator tool / platform' },
    { pattern: /\b(?:automotive|car|vehicle|electric vehicle|ev\b|motorcycle)\b/, label: 'Automotive', product: 'Vehicle / automotive product' },
    { pattern: /\b(?:technology|tech|software|app|phone|laptop|device|gadget|ai tool)\b/, label: 'Technology', product: 'Technology product / service' },
    { pattern: /\b(?:consumer product|household|home appliance|product launch|product demo)\b/, label: 'Consumer products', product: 'Consumer product' },
  ];
  const categoryMatch = categories.find(({ pattern }) => pattern.test(allText));
  const category = categoryMatch?.label || 'Consumer products';
  const product = /\b(?:running shoes?|running footwear|runner|runners|night run)\b/.test(allText) && /\b(?:shoes?|sneakers?|footwear)\b/.test(allText)
    ? 'Performance running shoes'
    : category === 'Footwear' ? 'Footwear product' : categoryMatch?.product || 'Product / offering';
  const regionMatch = concept.match(/\bin\s+(Dubai|Abu Dhabi|UAE|United Arab Emirates|London|New York|Paris|Tokyo|Riyadh|Doha)\b/i);
  const settingMatch = concept.match(/\b(?:during|at|on|through)\s+(?:a|an|the)?\s*([^,.!?;]{2,42})/i);
  const setting = settingMatch?.[1]?.trim().replace(/\s+/g, ' ');
  const context = regionMatch && /\bnight\b/i.test(concept)
    ? `${regionMatch[1]} night run`
    : regionMatch
      ? `${regionMatch[1]} setting`
      : setting
        ? setting.charAt(0).toUpperCase() + setting.slice(1)
        : brief.market.trim() ? `${brief.market.trim()} market context` : 'Setting not specified';
  const format = /\b(?:test|testing|try|trial|review|compare|comparison)\b/.test(concept)
    ? 'Product test / experiential'
    : isList ? 'List / direct-to-camera'
      : /\b(?:tutorial|how to|demonstrat|walkthrough)\b/.test(concept) ? 'Tutorial / demonstration'
        : /\b(?:vlog|day in the life|creator)\b/.test(concept) ? 'Creator experience'
          : 'Short-form explainer';
  return {
    hookType: isList ? 'Numbered list / mistakes' : /question|\?/.test(concept) ? 'Question / tension' : /\b(?:test|challenge|compare)\b/.test(concept) ? 'Test / challenge' : 'Declarative claim',
    contentFormat: format,
    category,
    product,
    context,
    audience: brief.audience || 'Audience not supplied',
    problem: isProblemSolution ? 'A recognizable concern or test is framed before the takeaway' : 'Problem signal is not explicit',
    productRole: /product|introduc|solution|brand|shoe|app|service/.test(concept) ? 'Product introduced in the context of the concept' : 'Product role not explicit',
    tone: isExpert ? 'Educational / authoritative' : /\b(?:test|run|try|experience)\b/.test(concept) ? 'Experiential / practical' : 'Practical / conversational',
    expertStyle: isExpert ? 'Subject-matter expert explanation' : 'Creator-led demonstration',
    ctaStyle: /introduc|shop|try|learn|comment|link|compare/.test(concept) ? 'Product introduction / next step' : 'Soft next step',
    structure: isProblemSolution ? 'Hook → problem or test → experience → product takeaway' : 'Hook → demonstration → takeaway → next step',
  };
}

export function buildAnalysis(brief: Brief): Analysis {
  const decomposition = decomposeConcept(brief);
  const categoryMatchedIllustration = decomposition.category === 'Skincare';
  const fallbackEvidence = categoryMatchedIllustration ? demoEvidence : [];
  const signals: Signal[] = categoryMatchedIllustration ? [
    { name: 'Performance Signal', score: 68, basis: '3 illustrative skincare records have engagement metrics; values are training-only, not live results. Higher = stronger observed sample signal.', direction: 'positive' },
    { name: 'Saturation Risk', score: 55, basis: 'Numbered skincare mistakes are a familiar format across the illustrative set; higher = more crowded.', direction: 'risk' },
    { name: 'Hook Freshness', score: 63, basis: `The ${decomposition.hookType.toLowerCase()} is clear, while the opening language resembles familiar skincare education patterns. Higher = stronger freshness.`, direction: 'positive' },
    { name: 'Creator Diversity', score: 54, basis: '3 illustrative records span creator-led and expert-led executions. Higher = stronger diversity.', direction: 'positive' },
    { name: 'Evidence Strength', score: 74, basis: '3 clearly illustrative records include text and match notes; no live sample size is claimed. Higher = stronger evidence coverage.', direction: 'positive' },
  ] : [
    { name: 'Performance Signal', score: 50, basis: `No category-matched illustrative metrics are available for ${decomposition.category}; neutral, not an observed performance result. Higher = stronger observed sample signal.`, direction: 'positive' },
    { name: 'Saturation Risk', score: 50, basis: 'No category-matched illustrative sample is available; risk is neutral, not assumed low. Higher = more crowded.', direction: 'risk' },
    { name: 'Hook Freshness', score: 50, basis: 'No category-matched openings are available to compare; freshness is uncertain. Higher = stronger freshness.', direction: 'positive' },
    { name: 'Creator Diversity', score: 0, basis: 'No category-matched illustrative creators are available. Higher = stronger diversity.', direction: 'positive' },
    { name: 'Evidence Strength', score: 0, basis: 'No category-matched illustrative evidence is available. Higher = stronger evidence coverage.', direction: 'positive' },
  ];
  const performance = signals[0].score;
  const saturationOpportunity = 100 - signals[1].score;
  const rawScore = clamp(performance * .30 + saturationOpportunity * .25 + signals[2].score * .20 + signals[3].score * .15 + signals[4].score * .10);
  const score = categoryMatchedIllustration ? rawScore : 0;
  const decision = categoryMatchedIllustration
    ? score >= 72 ? 'GO' : score >= 48 ? 'REVISE' : 'AVOID'
    : 'INCONCLUSIVE';
  return {
    source: 'demo-illustrative',
    decomposition,
    signals,
    score,
    decision,
    evidence: fallbackEvidence,
    why: [
      `The concept has a legible ${decomposition.hookType.toLowerCase()} and a ${decomposition.contentFormat.toLowerCase()} structure for ${decomposition.category}.`,
      categoryMatchedIllustration
        ? 'The clearly illustrative sample offers skincare-education context only; it does not verify brand-specific claims or a product outcome.'
        : `Oriane was unavailable and no ${decomposition.category.toLowerCase()}-matched illustrative evidence is supplied, so no unrelated category claims are used.`,
      categoryMatchedIllustration
        ? 'Treat the familiar category patterns as directional training examples, not live market evidence.'
        : 'NO STRONG COMPARABLE EVIDENCE FOUND. This brief-guided fallback cannot judge the concept; the result is inconclusive without category-matched evidence.',
    ],
  };
}

const mean = (numbers: number[]) => numbers.reduce((sum, value) => sum + value, 0) / (numbers.length || 1);

export function buildLiveAnalysis(brief: Brief, evidence: VideoEvidence[], trace?: SearchTrace): Analysis {
  const decomposition = decomposeConcept(brief);
  const scoredEvidence = evidence.filter((item) => item.usedForScoring !== false);
  const count = scoredEvidence.length;
  const displayedCount = trace?.displayed ?? evidence.length;
  const lowUnscoredAvailable = evidence.filter((item) => item.usedForScoring === false && item.relevanceLevel === 'low').length;
  const relevantUnscoredAvailable = evidence.filter((item) =>
    item.usedForScoring === false && (item.relevanceLevel === 'high' || item.relevanceLevel === 'medium')
  ).length;
  const cappedContext = trace?.capped === undefined
    ? 'The total number of relevant records not scored due to the cap was not supplied.'
    : `${trace.capped} additional relevant records were not scored due to the cap.`;
  const sampleContext = trace
    ? `${count} records used for scoring; ${displayedCount} displayed of ${trace.retrieved} unique retrieved; ${trace.excluded} low-relevance records excluded from scoring; ${cappedContext}`
    : `${count} records used for scoring among ${displayedCount} available/displayed records; ${lowUnscoredAvailable} available records explicitly marked low relevance and ${relevantUnscoredAvailable} available high/medium-relevance records not scored. Total unique retrieval, exclusion, and cap counts were not supplied.`;
  const views = scoredEvidence.flatMap((item) => item.views === undefined ? [] : [item.views]);
  const rates = scoredEvidence.flatMap((item) => item.engagementRate === undefined ? [] : [item.engagementRate]);
  const viewScore = views.length ? mean(views.map((value) => clamp(Math.log10(value + 1) / 6 * 100))) : 0;
  const rateScore = rates.length ? mean(rates.map((value) => clamp(value / 10 * 100))) : 0;
  const performance = views.length && rates.length
    ? clamp(viewScore * .55 + rateScore * .45)
    : clamp(views.length ? viewScore : rateScore);

  const hookMatches = scoredEvidence.filter((item) => item.match.comparableOpening === true).length;
  const hookShare = count ? hookMatches / count : 0;
  const creatorKeys = scoredEvidence.map((item) => `${item.platform || 'unknown'}:${item.profileHandle || item.creator || item.id}`.toLowerCase());
  const uniqueCreators = new Set(creatorKeys).size;
  const repeatedCreatorShare = count ? 1 - uniqueCreators / count : 0;
  const saturation = hookMatches ? clamp(hookShare * 75 + repeatedCreatorShare * 25) : 50;
  const freshness = hookMatches ? clamp(100 - hookShare * 80) : 50;
  const diversity = count ? clamp((uniqueCreators / count) * Math.min(count / 5, 1) * 100) : 0;

  const textCoverage = count ? scoredEvidence.filter((item) => !!(item.caption || item.transcript)).length / count : 0;
  const metricCoverage = count ? mean(scoredEvidence.map((item) =>
    [item.views, item.likes, item.comments, item.shares, item.engagementRate]
      .filter((value) => value !== undefined).length / 5
  )) : 0;
  const provenanceCoverage = count ? scoredEvidence.filter((item) => !!(item.platform && item.profileHandle && item.sourceNote)).length / count : 0;
  const strength = clamp(Math.min(count / 8, 1) * 25 + textCoverage * 20 + metricCoverage * 20 + provenanceCoverage * 10 + hookShare * 25);

  const signals: Signal[] = [
    { name: 'Performance Signal', score: performance, basis: views.length || rates.length
      ? `${views.length} view counts and ${rates.length} engagement rates. ${sampleContext} Scores normalize observed reach and engagement; they are not a prediction. Higher = stronger.`
      : `No reach or engagement metrics were supplied. ${sampleContext} Higher = stronger.`, direction: 'positive' },
    { name: 'Saturation Risk', score: saturation, basis: count && hookMatches
      ? `${hookMatches}/${count} scored records have structured comparable openings; ${count - uniqueCreators} repeat creators. ${sampleContext} This is sample-level overlap, not market-wide saturation. Higher = more crowded.`
      : count
        ? `No close hook comparison was found among scored records; risk is neutral (50), not assumed low. ${sampleContext}`
        : `No records qualified for scoring; saturation cannot be estimated (neutral 50). ${sampleContext}`, direction: 'risk' },
    { name: 'Hook Freshness', score: freshness, basis: count && hookMatches
      ? `${hookMatches}/${count} scored records have a structured comparable opening. ${sampleContext} Higher = stronger freshness within this sample.`
      : count
        ? `No comparable opening was identified among scored records; novelty is unproven, so freshness is neutral (50). ${sampleContext} Higher = stronger freshness.`
        : `No records qualified for scoring; freshness remains neutral (50), not automatically favorable. ${sampleContext} Higher = stronger freshness.`, direction: 'positive' },
    { name: 'Creator Diversity', score: diversity, basis: `${uniqueCreators} distinct platform/profile combinations among ${count} scored records; small relevant samples are discounted.`, direction: 'positive' },
    { name: 'Evidence Strength', score: strength, basis: `${Math.round(textCoverage * 100)}% of scored records have text, ${Math.round(metricCoverage * 100)}% of tracked metrics are available, and ${hookMatches} scored records have comparable openings. ${sampleContext} Higher = stronger evidence coverage.`, direction: 'positive' },
  ];
  const rawScore = clamp(performance * .30 + (100 - saturation) * .25 + freshness * .20 + diversity * .15 + strength * .10);
  const score = count === 0 ? 0 : count < 3 ? Math.min(rawScore, 55) : rawScore;
  const decision = count === 0 ? 'INCONCLUSIVE' : score >= 72 ? 'GO' : score >= 48 ? 'REVISE' : 'AVOID';
  return {
    source: 'live-oriane',
    decomposition,
    signals,
    score,
    decision,
    evidence,
    ...(trace ? { trace } : {}),
    why: [
      count
        ? `${count} Oriane records were used for scoring. ${sampleContext} The brief's market and goal informed the search but are not verified audience attributes.`
        : `Oriane connected, but no records qualified for scoring. ${sampleContext}`,
      `Observed performance is ${performance}/100 and evidence strength is ${strength}/100; these scores use supplied video fields, not illustrative metrics.`,
      count === 0
        ? 'NO STRONG COMPARABLE EVIDENCE FOUND. The brief cannot be judged from this sample, so the result is inconclusive rather than a negative verdict.'
        : count < 3
          ? 'The relevant evidence sample is too small for a strong recommendation; the score is capped for uncertainty.'
          : hookMatches
            ? `${hookMatches} of ${count} relevant videos have a structured comparable opening. This informs freshness, not guaranteed performance.`
            : 'No structured comparable opening was identified; freshness and saturation are treated as uncertain rather than automatically favorable.',
    ],
  };
}

export function formatMetric(value?: number) {
  if (value === undefined || value === null) return 'Not supplied';
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  return value.toLocaleString();
}

export function recordText(record: VideoEvidence) {
  return record.caption?.trim() || record.transcript?.trim() || 'No caption or transcript supplied.';
}