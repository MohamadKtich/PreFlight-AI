import type { VideoEvidence } from './preflight';

export type EvidenceInsights = {
  count: number;
  totalViews: number | null;
  viewCoverage: number;
  averageEngagement: number | null;
  engagementCoverage: number;
  topPlatform: { label: string; count: number } | null;
  platformCounts: { label: string; count: number }[];
  topAngle: { label: string; count: number } | null;
  patterns: { label: string; count: number }[];
  creatorCount: number;
  knownCreatorCount: number;
  largestCreatorShare: number;
  creatorGroups: { label: string; count: number }[];
};

const themes = [
  { label: 'Routine / steps', pattern: /\b(?:routine|step|morning|night|daily)\b/i },
  { label: 'Product introduction', pattern: /\b(?:product|introduc|meet the|launch|new|try)\b/i },
  { label: 'Problem / concern', pattern: /\b(?:problem|mistake|concern|barrier|dryness|irritat|acne|stings?)\b/i },
  { label: 'Expert advice', pattern: /\b(?:dermatologist|doctor|expert|professional)\b/i },
  { label: 'Question opener', pattern: /\?/ },
  { label: 'List / tips', pattern: /\b(?:three|3|five|5)\b[\s\S]{0,45}\b(?:mistakes?|tips?|steps?|ways?)\b/i },
  { label: 'Review / favorites', pattern: /\b(?:review|favorites?|favs?|recommend)\b/i },
];

export function deriveEvidenceInsights(evidence: VideoEvidence[]): EvidenceInsights {
  const viewValues = evidence.flatMap((record) => record.views === undefined ? [] : [record.views]);
  const engagementValues = evidence.flatMap((record) => record.engagementRate === undefined ? [] : [record.engagementRate]);

  const platforms = new Map<string, number>();
  const creators = new Map<string, { label: string; count: number }>();
  for (const record of evidence) {
    if (record.platform) platforms.set(record.platform, (platforms.get(record.platform) ?? 0) + 1);
    const identity = record.profileHandle || record.creator;
    if (identity) {
      const key = `${record.platform || 'unknown'}:${identity}`.toLowerCase();
      const existing = creators.get(key);
      creators.set(key, { label: existing?.label ?? (record.profileHandle ? `@${record.profileHandle}` : identity), count: (existing?.count ?? 0) + 1 });
    }
  }
  const sortCounts = (a: { label: string; count: number }, b: { label: string; count: number }) =>
    b.count - a.count || a.label.localeCompare(b.label);
  const platformCounts = [...platforms].map(([label, count]) => ({ label, count })).sort(sortCounts);
  const creatorGroups = [...creators.values()].sort(sortCounts);

  const patterns = themes.map(({ label, pattern }) => ({
    label,
    count: evidence.filter((record) =>
      pattern.test(`${(record.caption || '').slice(0, 220)} ${(record.transcript || '').slice(0, 220)}`)
    ).length,
  })).filter(({ count }) => count > 0).sort(sortCounts);

  return {
    count: evidence.length,
    totalViews: viewValues.length ? viewValues.reduce((sum, value) => sum + value, 0) : null,
    viewCoverage: viewValues.length,
    averageEngagement: engagementValues.length
      ? Math.round(engagementValues.reduce((sum, value) => sum + value, 0) / engagementValues.length * 10) / 10
      : null,
    engagementCoverage: engagementValues.length,
    topPlatform: platformCounts[0] ?? null,
    platformCounts,
    topAngle: patterns.find(({ count }) => count >= 2) ?? null,
    patterns,
    creatorCount: creatorGroups.length,
    knownCreatorCount: creatorGroups.reduce((sum, item) => sum + item.count, 0),
    largestCreatorShare: creatorGroups.length && evidence.length ? creatorGroups[0].count / evidence.length : 0,
    creatorGroups,
  };
}