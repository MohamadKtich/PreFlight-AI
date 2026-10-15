import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import type { Analysis, VideoEvidence } from '@/lib/preflight';
import type { EvidenceInsights } from '@/lib/insights';

type LiveAnalyticsProps = { analysis: Analysis; insights: EvidenceInsights };
type PlotPoint = VideoEvidence & { plotViews: number; plotRate: number; interactions: number; hasInteractions: boolean };

const signalNames: Analysis['signals'][number]['name'][] = [
  'Performance Signal',
  'Saturation Risk',
  'Hook Freshness',
  'Creator Diversity',
  'Evidence Strength',
];

const integer = (value: number) => value.toLocaleString();
const compact = (value: number) => Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
const percentage = (value: number) => `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
const metric = (value: number | undefined) => value === undefined || !Number.isFinite(value) ? 'Not supplied' : integer(value);
const sourceText = (source: Analysis['source']) => source === 'live-oriane' ? 'LIVE ORIANE SAMPLE' : 'DEMO / ILLUSTRATIVE SAMPLE';
const focusEvidence = (id: string) => window.dispatchEvent(new CustomEvent('preflight:focus-evidence', { detail: id }));
const focusScatterPoint = (point: PlotPoint & { payload?: PlotPoint }) => {
  // Recharts passes a rendered scatter point; the original record lives in payload.
  const id = point.payload?.id ?? point.id;
  if (typeof id === 'string') focusEvidence(id);
};

function PanelHeading({ kicker, title, aside }: { kicker: string; title: string; aside?: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div>
        <p className="eyebrow">{kicker}</p>
        <h3 className="mt-1.5 font-display text-lg font-semibold tracking-tight text-[#eae5d4]">{title}</h3>
      </div>
      {aside && <span className="rounded-full border border-[#e0dac5]/10 bg-[#e0dac5]/[.04] px-2.5 py-1 font-mono-ui text-[10px] text-[#a6a6a5]">{aside}</span>}
    </div>
  );
}

function EmptyPanel({ children }: { children: string }) {
  return <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-[#e0dac5]/15 bg-[#0f121b]/30 px-5 text-center text-xs leading-6 text-[#a7a8ad]">{children}</div>;
}

function EvidenceTooltip({ point }: { point: PlotPoint }) {
  const text = point.caption?.trim() || point.transcript?.trim();
  return (
    <div className="max-w-[270px] rounded-xl border border-[#d9b85e]/30 bg-[#191d28] p-3.5 text-left shadow-xl shadow-[#080b12]/50">
      <div className="flex items-start justify-between gap-3">
        <strong className="min-w-0 break-words font-display text-xs text-[#f0e9d4]">{point.creator || (point.profileHandle ? `@${point.profileHandle}` : 'Creator not supplied')}</strong>
        <span className="shrink-0 font-mono-ui text-[10px] text-[#92c6be]">{point.platform || 'Platform unknown'}</span>
      </div>
      <p className="mt-1 text-[10px] text-[#999ca7]">{point.source === 'live-oriane' ? 'LIVE ORIANE EVIDENCE' : 'DEMO / ILLUSTRATIVE'}</p>
      <p className="mt-3 line-clamp-3 border-t border-[#e0dac5]/10 pt-2.5 text-[11px] leading-5 text-[#c4c2b9]">{text ? `“${text.slice(0, 175)}${text.length > 175 ? '…' : ''}”` : 'Caption / transcript not supplied'}</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[#e0dac5]/10 pt-2.5 font-mono-ui text-[10px]">
        {([
          ['Views', metric(point.views)],
          ['Engagement', percentage(point.plotRate)],
          ['Likes', metric(point.likes)],
          ['Comments', metric(point.comments)],
          ['Shares', metric(point.shares)],
          ['Interactions', point.hasInteractions ? metric(point.interactions) : 'Not supplied'],
          ['Heuristic relevance', point.relevanceScore === undefined ? 'Not assessed' : `${point.relevanceScore}% match`],
        ] as const).map(([label, value]) => (
          <div key={label}><dt className="text-[#8f929d]">{label}</dt><dd className="mt-0.5 text-[#e6dfcc]">{value}</dd></div>
        ))}
      </dl>
    </div>
  );
}

export function LiveAnalytics({ analysis, insights }: LiveAnalyticsProps) {
  const evidence = analysis.evidence.filter(record => record.usedForScoring !== false);
  const total = evidence.length;
  const lowExcluded = analysis.trace?.excluded ?? analysis.evidence.filter(record => record.usedForScoring === false && record.relevanceLevel === 'low').length;
  const capped = (analysis.trace as (NonNullable<Analysis['trace']> & { capped?: number }) | undefined)?.capped ?? analysis.evidence.filter(record => record.usedForScoring === false && record.relevanceLevel !== 'low').length;
  const points: PlotPoint[] = evidence
    .filter((record): record is VideoEvidence & { views: number; engagementRate: number } =>
      typeof record.views === 'number' && Number.isFinite(record.views) &&
      typeof record.engagementRate === 'number' && Number.isFinite(record.engagementRate))
    .map((record) => ({
      ...record,
      plotViews: record.views,
      plotRate: record.engagementRate,
      interactions: (record.likes ?? 0) + (record.comments ?? 0) + (record.shares ?? 0),
      hasInteractions: [record.likes, record.comments, record.shares].some((value) => value !== undefined && Number.isFinite(value)),
    }));
  const knownSize = points.filter((point) => point.hasInteractions);
  const unknownSize = points.filter((point) => !point.hasInteractions);
  const missingPlatform = Math.max(0, total - insights.platformCounts.reduce((sum, platform) => sum + platform.count, 0));
  const unknownCreatorRecords = Math.max(0, total - insights.knownCreatorCount);
  const maxPlatform = Math.max(1, ...insights.platformCounts.map((item) => item.count));
  const maxPattern = Math.max(1, ...insights.patterns.map((item) => item.count));
  const maxCreator = Math.max(1, ...insights.creatorGroups.map((item) => item.count));

  return (
    <section aria-labelledby="live-analytics-title" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Evidence analytics</p>
          <h2 id="live-analytics-title" className="mt-2 font-display text-2xl font-semibold tracking-tight text-[#eee9d8]">Inside the sample.</h2>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-[#989ba5]">A descriptive view of {total} scored records; {lowExcluded} low-relevance results excluded and {capped} relevant records beyond the scoring cap. {analysis.evidence.length} displayed records remain browsable in Evidence. These patterns do not establish campaign outcomes or market-wide prevalence.</p>
        </div>
        <span data-testid="status-analytics-source" className={`rounded-full border px-3 py-1.5 font-mono-ui text-[10px] tracking-wide ${analysis.source === 'live-oriane' ? 'border-[#4ea49a]/30 bg-[#4ea49a]/[.08] text-[#a5d6cb]' : 'border-[#d9b85e]/30 bg-[#d9b85e]/[.08] text-[#e4d099]'}`}>
          {sourceText(analysis.source)} · {total} record{total === 1 ? '' : 's'}
        </span>
      </div>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <article data-testid="panel-analytics-performance" aria-labelledby="analytics-performance-title" className="panel min-w-0 rounded-2xl p-5 md:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div><p className="eyebrow">01 / Evidence performance</p><h3 id="analytics-performance-title" className="mt-1.5 font-display text-lg font-semibold tracking-tight text-[#eae5d4]">Reach × engagement</h3></div>
            <span data-testid="text-analytics-plot-coverage" className="rounded-full border border-[#62c2ad]/20 bg-[#62c2ad]/[.07] px-2.5 py-1 font-mono-ui text-[10px] text-[#9fd7cb]">{points.length} / {total} plotted</span>
          </div>
          {points.length ? (
            <>
              <div role="img" aria-label={`Scatter plot of views against engagement rate for ${points.length} of ${total} records. Details of each plotted record are available in the accessible data list.`} className="h-[250px] w-full sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 12, right: 18, bottom: 14, left: 0 }} accessibilityLayer>
                    <CartesianGrid stroke="#424452" strokeOpacity={0.35} strokeDasharray="3 5" />
                    <XAxis type="number" dataKey="plotViews" name="Views" tickFormatter={compact} tick={{ fill: '#9699a4', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#51515c' }} domain={[0, 'auto']} label={{ value: 'Views', position: 'insideBottom', offset: -9, fill: '#aba9a2', fontSize: 11 }} />
                    <YAxis type="number" dataKey="plotRate" name="Engagement rate" unit="%" tick={{ fill: '#9699a4', fontSize: 10 }} tickLine={false} axisLine={false} width={48} domain={[0, 'auto']} label={{ value: 'Engagement %', angle: -90, position: 'insideLeft', fill: '#aba9a2', fontSize: 11 }} />
                    <ZAxis type="number" dataKey="interactions" range={[65, 380]} />
                    <Tooltip cursor={{ stroke: '#d9b85e', strokeDasharray: '3 4', strokeOpacity: 0.6 }} wrapperStyle={{ zIndex: 10 }} content={({ active, payload }) => {
                      const point = payload?.[0]?.payload as PlotPoint | undefined;
                      return active && point ? <EvidenceTooltip point={point} /> : null;
                    }} />
                    <Scatter name="Interaction metrics supplied" data={knownSize} fill="#74bfb0" fillOpacity={0.76} stroke="#addbd1" strokeWidth={1.5} isAnimationActive={false} onClick={focusScatterPoint} style={{ cursor: 'pointer' }} />
                    <Scatter name="Interaction metrics unavailable" data={unknownSize} fill="#1b202b" fillOpacity={1} stroke="#d9b85e" strokeWidth={2} isAnimationActive={false} onClick={focusScatterPoint} style={{ cursor: 'pointer' }} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[10px] leading-5 text-[#a5a5a7]">
                <span><span aria-hidden="true" className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full border border-[#addbd1] bg-[#74bfb0]" /> Size = supplied likes + comments + shares ({knownSize.length})</span>
                {unknownSize.length > 0 && <span><span aria-hidden="true" className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full border-2 border-[#d9b85e]" /> Interaction metrics not supplied ({unknownSize.length}); marker size is not zero activity</span>}
              </div>
              <div className="sr-only">
                <p>Plotted records, with values as supplied:</p>
                <ul>{points.map((point, index) => <li key={`${point.id}-${index}`}>{point.creator || point.profileHandle || 'Creator not supplied'}, {point.platform || 'platform not supplied'}: {integer(point.plotViews)} views, {percentage(point.plotRate)} engagement; likes {metric(point.likes)}, comments {metric(point.comments)}, shares {metric(point.shares)}.</li>)}</ul>
              </div>
            </>
          ) : <EmptyPanel>{total ? 'No record supplies both views and engagement rate. There is no valid point to plot.' : 'No evidence records are available to plot.'}</EmptyPanel>}
          <p data-testid="text-analytics-coverage-note" className="mt-4 border-t border-[#e0dac5]/10 pt-3 text-[11px] leading-5 text-[#898d98]">
            {total - points.length} record{total - points.length === 1 ? '' : 's'} excluded for missing views or engagement rate. Each point is one {analysis.source === 'live-oriane' ? 'live indexed video' : 'illustrative record'}; engagement rates are supplied values, not recalculated here. Partial interaction totals use only supplied fields.
          </p>
        </article>

        <article data-testid="panel-analytics-platforms" aria-labelledby="analytics-platforms-title" className="panel min-w-0 rounded-2xl p-5 md:p-6">
          <div id="analytics-platforms-title"><PanelHeading kicker="02 / Sample composition" title="Platform breakdown" aside={`${insights.platformCounts.length} named`} /></div>
          {insights.platformCounts.length ? (
            <div className="space-y-4">
              {insights.platformCounts.map((platform, index) => (
                 <div key={`${platform.label}-${index}`} data-testid={`row-analytics-platform-${index}`} tabIndex={0} title={`${platform.label}: ${platform.count} matched records, ${percentage(total ? platform.count / total * 100 : 0)} of scored sample`} aria-label={`${platform.label}: ${platform.count} matched records, ${percentage(total ? platform.count / total * 100 : 0)} of scored sample`} className="chart-hover-row group">
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs"><span className="break-words text-[#ddd9ca]">{platform.label}</span><span className="shrink-0 font-mono-ui text-[#d8c38a]">{platform.count} <span className="text-[#898d98]">/ {total}</span></span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#343845]"><div className="h-full rounded-full bg-[#6bb5a7]" style={{ width: `${platform.count / maxPlatform * 100}%` }} /></div>
                   <span className="hidden pt-1 font-mono-ui text-[10px] text-[#d9c88f] group-hover:block group-focus:block">{platform.count} records · {percentage(total ? platform.count / total * 100 : 0)} of scored sample</span>
                </div>
              ))}
              {missingPlatform > 0 && <p className="text-[11px] text-[#9295a0]">Platform not supplied for {missingPlatform} record{missingPlatform === 1 ? '' : 's'}.</p>}
            </div>
          ) : <EmptyPanel>{total ? 'No platform names were supplied for these records.' : 'No records to break down by platform.'}</EmptyPanel>}
          <p className="mt-5 border-t border-[#e0dac5]/10 pt-3 text-[11px] leading-5 text-[#898d98]">Counts are records in this {analysis.source === 'live-oriane' ? 'live' : 'illustrative'} sample, not platform market share. Bars scale to the largest observed platform.</p>
        </article>
      </div>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,1fr)]">
        <article data-testid="panel-analytics-signals" aria-labelledby="analytics-signals-title" className="panel min-w-0 rounded-2xl p-5 md:p-6">
          <div id="analytics-signals-title"><PanelHeading kicker="03 / Heuristic readout" title="Five signals, side by side" aside="Scores / 100" /></div>
          <div className="space-y-4">
            {signalNames.map((name) => {
              const signal = analysis.signals.find((item) => item.name === name);
              const isRisk = name === 'Saturation Risk';
              return (
                <div key={name} data-testid={`row-analytics-signal-${name.toLowerCase().replaceAll(' ', '-')}`}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-[#ddd9ca]">{name}</span>
                    <span className={`font-mono-ui text-xs ${isRisk ? 'text-[#d7a76a]' : 'text-[#d9c786]'}`}>{signal && Number.isFinite(signal.score) ? signal.score : '—'}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#343845]"><div className={`h-full rounded-full ${isRisk ? 'bg-[#c8905a]' : 'bg-[#cdb661]'}`} style={{ width: `${signal && Number.isFinite(signal.score) ? Math.max(0, Math.min(100, signal.score)) : 0}%` }} /></div>
                  {signal?.basis && <p className="mt-1.5 text-[10px] leading-4 text-[#8e929d]">{signal.basis}</p>}
                  {!signal && <p className="mt-1.5 text-[10px] text-[#8e929d]">Signal not available.</p>}
                </div>
              );
            })}
          </div>
          <p className="mt-5 rounded-lg border border-[#c8905a]/20 bg-[#c8905a]/[.06] px-3 py-2 text-[11px] leading-5 text-[#c9ad87]">Direction matters: higher Saturation Risk is unfavorable. Higher values on the other four signals are favorable. These are heuristic scores, not observed success rates.</p>
        </article>

        <article data-testid="panel-analytics-patterns" aria-labelledby="analytics-patterns-title" className="panel min-w-0 rounded-2xl p-5 md:p-6">
          <div id="analytics-patterns-title"><PanelHeading kicker="04 / Hook & phrase insight" title="Themes in the text" aside={`${insights.patterns.length} found`} /></div>
          {insights.patterns.length ? (
            <ol className="space-y-3">
              {insights.patterns.map((pattern, index) => (
                <li key={`${pattern.label}-${index}`} data-testid={`row-analytics-pattern-${index}`} className="rounded-lg border border-[#e0dac5]/[.08] bg-[#e0dac5]/[.025] px-3 py-2.5">
                  <div className="flex items-center gap-2.5 text-xs">
                    <span className="font-mono-ui text-[10px] text-[#9a9ca4]">{String(index + 1).padStart(2, '0')}</span>
                    <span className="min-w-0 flex-1 text-[#ddd9ca]">{pattern.label}</span>
                    <span className="shrink-0 font-mono-ui text-[#e0c979]">{pattern.count} <span className="text-[#878b95]">/ {total}</span></span>
                  </div>
                  <div className="ml-6 mt-2 h-1 overflow-hidden rounded-full bg-[#343845]"><div className="h-full rounded-full bg-[#b9a964]" style={{ width: `${pattern.count / maxPattern * 100}%` }} /></div>
                </li>
              ))}
            </ol>
          ) : <EmptyPanel>{total ? 'No tracked caption or opening themes were found in the supplied text.' : 'No evidence text is available for theme detection.'}</EmptyPanel>}
          <p className="mt-5 border-t border-[#e0dac5]/10 pt-3 text-[11px] leading-5 text-[#a5a5a7]"><strong className="font-semibold text-[#dccb9e]">Reading note.</strong> These are broad caption/opening themes, NOT verified matches to the submitted hook. A record may appear in multiple themes; counts are not mutually exclusive.</p>
        </article>
      </div>

      <article data-testid="panel-analytics-creators" aria-labelledby="analytics-creators-title" className="panel rounded-2xl p-5 md:p-6">
        <div id="analytics-creators-title"><PanelHeading kicker="05 / Creator diversity" title="Whose voices are represented?" aside={`${insights.creatorCount} identifiable ${insights.creatorCount === 1 ? 'creator' : 'creators'}`} /></div>
        <div className="grid gap-5 md:grid-cols-[minmax(0,.75fr)_minmax(0,1.25fr)]">
          <div className="grid grid-cols-2 gap-3">
            <div className="panel-soft rounded-xl p-4"><p className="label text-[10px]">Identifiable records</p><p data-testid="text-analytics-known-creators" className="mt-2 font-display text-2xl font-semibold text-[#e3d7ad]">{insights.knownCreatorCount}<span className="ml-1 text-sm text-[#8f929b]">/ {total}</span></p></div>
            <div className="panel-soft rounded-xl p-4"><p className="label text-[10px]">Largest creator share</p><p data-testid="text-analytics-largest-share" className="mt-2 font-display text-2xl font-semibold text-[#9acdc2]">{insights.creatorCount ? percentage(insights.largestCreatorShare * 100) : '—'}</p><p className="mt-1 text-[10px] text-[#898d98]">of all records</p></div>
            <p className="col-span-2 text-[11px] leading-5 text-[#989ba5]">{unknownCreatorRecords ? `${unknownCreatorRecords} record${unknownCreatorRecords === 1 ? ' has' : 's have'} no identifiable creator. Unknown creators are not assumed distinct.` : total ? 'Every record has a supplied creator or profile handle.' : 'No creator identities are available yet.'} Identifiable creators are grouped by platform and handle/name.</p>
          </div>
          <div className="min-w-0 border-t border-[#e0dac5]/10 pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
            <p className="label mb-3 text-[10px]">Records per identifiable creator</p>
            {insights.creatorGroups.length ? (
              <div className="max-h-48 space-y-2.5 overflow-y-auto pr-2">
                {insights.creatorGroups.map((creator, index) => (
                   <div key={`${creator.label}-${index}`} data-testid={`row-analytics-creator-${index}`} tabIndex={0} title={`${creator.label}: ${creator.count} matched records, ${percentage(total ? creator.count / total * 100 : 0)} of scored sample`} aria-label={`${creator.label}: ${creator.count} matched records, ${percentage(total ? creator.count / total * 100 : 0)} of scored sample`} className="chart-hover-row group relative flex items-center gap-3 text-[11px]">
                    <span className="w-28 shrink-0 truncate text-[#c9c8c1]" title={creator.label}>{creator.label}</span>
                    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#343845]"><div className="h-full rounded-full bg-[#6eb4aa]" style={{ width: `${creator.count / maxCreator * 100}%` }} /></div>
                    <span className="w-5 text-right font-mono-ui text-[#c8d5cc]">{creator.count}</span>
                     <span className="pointer-events-none absolute bottom-full left-0 z-10 hidden max-w-full rounded border border-[#d9b85e]/30 bg-[#202522] px-2 py-1 font-mono-ui text-[10px] text-[#e1d7b7] group-hover:block group-focus:block">{creator.label} · {creator.count} records · {percentage(total ? creator.count / total * 100 : 0)} of scored sample</span>
                  </div>
                ))}
              </div>
            ) : <EmptyPanel>{total ? 'Creator identifiers were not supplied; repeat exposure cannot be assessed.' : 'No creator groups to display.'}</EmptyPanel>}
          </div>
        </div>
      </article>
    </section>
  );
}