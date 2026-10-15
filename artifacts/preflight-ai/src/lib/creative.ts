import type { Analysis, Brief } from './preflight';
import type { EvidenceInsights } from './insights';

export type HookOption = {
  label: 'A' | 'B' | 'C';
  angle: string;
  hook: string;
  rationale: string;
  whyDraft: string;
  recommendedForTesting: boolean;
  supportingEvidenceIds?: string[];
};

export type CreativeRewrite = {
  hook: string;
  hookRationale: string;
  scriptRationale: string;
  storyboardRationale: string;
  evidenceNote: string;
  guidanceLabel: string;
  hookOptions: HookOption[];
  script: { label: string; text: string }[];
  shots: { time: string; visual: string; camera: string; spoken: string; purpose: string }[];
};

function openingPatternSupports(pattern: string | undefined, kind: 'test' | 'curiosity' | 'problem') {
  if (!pattern) return false;
  const match = kind === 'test'
    ? /\b(?:performance|test|demonstration|comparison|challenge)\b/i
    : kind === 'curiosity'
      ? /\b(?:question|curiosity|open loop)\b/i
      : /\b(?:problem|pain|mistake|solution|tension)\b/i;
  return match.test(pattern);
}

export function buildCreativeRewrite(
  brief: Brief,
  analysis: Analysis,
  _insights: EvidenceInsights,
): CreativeRewrite {
  const decomposition = analysis.decomposition;
  const expert = /\b(?:dermatolog|doctor|expert|specialist|coach|chef|mechanic)\w*/i.test(brief.concept);
  const presenter = expert ? 'the subject-matter expert' : 'the creator';
  const audience = brief.audience.trim() || 'the intended audience';
  const category = decomposition.category.toLowerCase();
  const brand = brief.brand.trim();
  const product = decomposition.product.toLowerCase();
  const subject = [brand, decomposition.product.toLowerCase()].filter(Boolean).join(' ') || 'the product';
  const hasSpecificContext = !!decomposition.context && !/market context|not specified/i.test(decomposition.context);
  const context = hasSpecificContext ? decomposition.context : '';
  const concept = brief.concept.trim();
  const testConcept = /\b(?:test|testing|try|trial|review|compare|run)\b/i.test(concept);
  const problemMatch = concept.match(/\b(?:three|3|five|5)?\s*([a-z -]{0,30}(?:mistakes?|problems?|challenges?|concerns?|questions?|issues?))\b/i);
  const keyTension = problemMatch?.[1]?.trim().toLowerCase().replace(/\s+/g, ' ') || '';
  const saturation = analysis.signals.find((signal) => signal.name === 'Saturation Risk')?.score ?? 50;
  const freshness = analysis.signals.find((signal) => signal.name === 'Hook Freshness')?.score ?? 50;
  const relevantEvidence = analysis.evidence.filter((item) => item.usedForScoring !== false);
  const retrievedCount = analysis.evidence.length;
  const usedCount = relevantEvidence.length;
  const excludedCount = retrievedCount - usedCount;
  const live = analysis.source === 'live-oriane';
  const hasLiveEvidence = live && usedCount > 0;
  const contextPhrase = context || `a real ${category} setting`;
  const hookA = testConcept || hasSpecificContext
    ? `What does a ${contextPhrase} test reveal about ${subject}?`
    : `What can ${audience} learn from seeing ${subject} in use?`;
  const hookB = `Before trying ${subject}, what would you want to see for yourself?`;
  const hookC = keyTension
    ? `Which ${keyTension.replace(/s$/, '')} is easiest to miss in ${category}?`
    : `What is the first ${category} detail ${audience} should check about ${product}?`;

  const comparableEvidence = relevantEvidence.filter((item) => item.match.comparableOpening === true);
  const evidenceByOption = (['test', 'curiosity', 'problem'] as const).map((kind) =>
    comparableEvidence.filter((item) => openingPatternSupports(item.match.openingPattern, kind))
  );
  const optionData = [
    { label: 'A' as const, angle: testConcept || hasSpecificContext ? 'Performance / real-world test' : 'Creator experience', hook: hookA },
    { label: 'B' as const, angle: 'Question / curiosity', hook: hookB },
    { label: 'C' as const, angle: keyTension ? 'Problem / overlooked detail' : 'Product-detail check', hook: hookC },
  ];
  const evidenceSupportsAnOption = evidenceByOption.some((records) => records.length > 0);
  const preferredBriefAngle = testConcept || hasSpecificContext ? 0 : 1;
  const recommendedIndex = hasLiveEvidence && evidenceSupportsAnOption ? optionData
    .map((_option, index) => ({ index, supportCount: evidenceByOption[index].length }))
    .sort((a, b) => a.supportCount - b.supportCount || a.index - b.index)[0]?.index ?? preferredBriefAngle
    : preferredBriefAngle;
  const hookOptions: HookOption[] = optionData.map((option, index) => {
    const supportedRecords = evidenceByOption[index];
    const evidenceReason = supportedRecords.length
      ? `${supportedRecords.length} relevant record${supportedRecords.length === 1 ? '' : 's'} are marked as comparable openings and carry a structured ${index === 0 ? 'test/performance' : index === 1 ? 'question/curiosity' : 'problem/tension'} pattern.`
      : comparableEvidence.length
        ? 'No structured comparable-opening pattern in the relevant sample directly supports this angle; it is brief-guided.'
        : 'No structured comparable openings support this angle; it is brief-guided, not evidence of freshness.';
    return {
      label: option.label,
      angle: option.angle,
      hook: option.hook,
      rationale: evidenceReason,
      whyDraft: `Uses ${category} detail and the ${audience} audience without asserting an unverified product result.`,
      recommendedForTesting: index === recommendedIndex,
      ...(supportedRecords.length ? { supportingEvidenceIds: supportedRecords.map((record) => record.id) } : {}),
    };
  });
  const recommended = hookOptions[recommendedIndex];
  const hook = recommended.hook;
  const problem = keyTension
    ? `Set up the ${keyTension} named in the concept; keep the explanation specific to what is actually shown.`
    : `Introduce the ${decomposition.hookType.toLowerCase()} from the brief and make the ${category} premise clear for ${audience}.`;
  const insight = testConcept
    ? `Show one observable part of the ${decomposition.contentFormat.toLowerCase()} and describe what the viewer can assess, without claiming a result.`
    : `Explain one useful ${category} detail from the submitted concept, using an on-camera example rather than an unsupported claim.`;
  const productRole = `Introduce ${brand || 'the brand'} and show the relevant ${product} details; avoid implying an outcome the evidence or demonstration does not establish.`;
  const cta = brief.goal === 'Conversion'
    ? `Review the demonstrated details of ${subject}, then decide whether it fits your needs.`
    : brief.goal === 'Product Launch'
      ? `Take a closer look at ${subject} and the specific details shown here.`
      : brief.goal === 'Education'
        ? `Save this ${category} breakdown for the next time you explore ${product}.`
        : brief.goal === 'Creator Campaign'
          ? `Show how you would explore ${product}${context ? ` in ${context}` : ' in use'}.`
          : `Explore the ${brand || category} story and share the detail you would want to see next.`;

  const evidenceNote = live
    ? usedCount
      ? `${usedCount} of ${retrievedCount} Oriane records informed scoring and this draft; ${excludedCount} were excluded from scoring. ${comparableEvidence.length} of the relevant records carry a structured comparable opening.${comparableEvidence.length ? '' : ' NO STRONG COMPARABLE EVIDENCE FOUND in the relevant opening sample.'} Relevance and opening-pattern labels are heuristic, sample-specific evidence—not market-wide patterns or predicted outcomes.`
      : `NO STRONG COMPARABLE EVIDENCE FOUND. Oriane returned ${retrievedCount} record${retrievedCount === 1 ? '' : 's'}, but none qualified for scoring. The ${category} result is inconclusive, not a negative verdict; this draft follows the brief and missing comparisons do not prove freshness.`
    : usedCount
      ? `This fallback uses ${usedCount} clearly illustrative ${category} record${usedCount === 1 ? '' : 's'}; they are training examples, not live or brand-specific results.`
      : `NO STRONG COMPARABLE EVIDENCE FOUND. Oriane was unavailable and no category-matched illustrative evidence exists for ${category}. This fallback is inconclusive, follows the brief only, and is not a negative verdict or live evidence.`;
  const recommendationReason = hasLiveEvidence
    ? comparableEvidence.length
      ? evidenceSupportsAnOption
        ? `Recommended for testing because this angle has the fewest matching structured opening patterns (${evidenceByOption[recommendedIndex].length} of ${comparableEvidence.length} comparable openings) among the three options. Saturation risk is ${saturation}/100 (higher means more crowded) and hook freshness is ${freshness}/100 (higher means fresher within this sample); these are heuristic signals, not performance predictions.`
        : `Relevant records include ${comparableEvidence.length} structured comparable openings, but their opening-pattern labels do not map clearly to these three angles. This recommendation follows the brief, not a pattern-overlap claim.`
      : `No structured comparable openings were identified among ${usedCount} relevant records. This brief-specific angle is recommended for testing without treating neutral saturation (${saturation}/100) or freshness (${freshness}/100) as evidence of success.`
    : usedCount
      ? 'This category-matched illustrative fallback can guide a draft but cannot rank live performance; the angle is selected from the brief for testing only.'
      : 'The result is inconclusive: there is no relevant evidence to support a negative verdict or rank likely performance. This angle is selected from the brief for testing only.';

  return {
    hook,
    hookRationale: `${recommendationReason} ${recommended.rationale} ${evidenceNote}`,
    scriptRationale: `The sequence opens with the recommended hook, then names the concept's ${category} premise, shows an observable detail, and introduces ${brand || 'the brand'} without an unverified outcome. ${evidenceNote}`,
    storyboardRationale: `Four short beats carry the recommended hook into a ${context || category} demonstration and a clear product-role close. The board describes a proposed execution, not observed product performance. ${evidenceNote}`,
    evidenceNote,
    guidanceLabel: hasLiveEvidence ? 'RELEVANCE-FILTERED / DETERMINISTIC DRAFT' : 'BRIEF-GUIDED / DETERMINISTIC DRAFT',
    hookOptions,
    script: [
      { label: 'HOOK', text: hook },
      { label: keyTension ? 'CONCEPT TENSION' : 'PREMISE', text: problem },
      { label: 'DEMONSTRATION', text: insight },
      { label: 'PRODUCT ROLE', text: productRole },
      { label: 'CTA', text: cta },
    ],
    shots: [
      { time: '0:00–0:03', visual: `Open in ${contextPhrase} with a concrete ${category} detail before showing the product.`, camera: 'Tight, eye-level shot; leave room for the selected short hook.', spoken: hook, purpose: `Establish the selected ${recommended.angle.toLowerCase()} angle immediately.` },
      { time: '0:03–0:07', visual: `${presenter} introduces the exact premise or tension in the submitted concept.`, camera: 'Clean medium shot with one setting-specific detail.', spoken: problem, purpose: 'Make the brief premise legible before the product appears.' },
      { time: '0:07–0:14', visual: `${presenter} demonstrates one observable ${product} detail or step relevant to the concept.`, camera: 'Simple close-up and one readable on-screen takeaway.', spoken: insight, purpose: 'Offer a useful, verifiable viewing point without claiming an outcome.' },
      { time: '0:14–0:20', visual: `${brand || 'The brand'} enters beside the demonstration; finish with a clear next step.`, camera: 'Brief product insert, return to presenter, hold the end frame.', spoken: `${productRole} ${cta}`, purpose: 'Connect the product to the concept and close without an unsupported claim.' },
    ],
  };
}