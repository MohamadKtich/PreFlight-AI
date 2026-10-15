import { Activity, Eye, Layers3, MessageCircleMore, ShieldCheck } from 'lucide-react';
import type { Analysis } from '@/lib/preflight';
import type { EvidenceInsights } from '@/lib/insights';

export function SearchSummary({ analysis, insights }: { analysis: Analysis; insights: EvidenceInsights }) {
  const source = analysis.source === 'live-oriane' ? 'LIVE ORIANE EVIDENCE' : 'TRAINING / ILLUSTRATIVE FALLBACK';
  const trace = analysis.trace as (NonNullable<Analysis['trace']> & { capped?: number; displayed?: number }) | undefined;
  const lowExcluded = trace?.excluded ?? analysis.evidence.filter(record => record.usedForScoring === false && record.relevanceLevel === 'low').length;
  const capped = trace?.capped ?? analysis.evidence.filter(record => record.usedForScoring === false && record.relevanceLevel !== 'low').length;
  const stats = [
    { label: 'Evidence videos', value: String(insights.count), detail: `Scored · ${trace?.displayed ?? analysis.evidence.length} displayed`, icon: Layers3 },
    { label: 'Total views', value: insights.totalViews === null ? 'Not supplied' : insights.totalViews.toLocaleString(), detail: `${insights.viewCoverage}/${insights.count} supplied`, icon: Eye },
    { label: 'Avg. engagement', value: insights.averageEngagement === null ? 'Not supplied' : `${insights.averageEngagement}%`, detail: `${insights.engagementCoverage}/${insights.count} supplied`, icon: Activity },
    { label: 'Top platform', value: insights.topPlatform?.label ?? 'Not supplied', detail: insights.topPlatform ? `${insights.topPlatform.count}/${insights.count} videos` : 'No platform data', icon: ShieldCheck },
  ];
  return (
    <div data-testid="panel-search-summary" className="panel border-t border-t-[#d9b85e]/45 p-5 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-2">
        <div><p className="eyebrow">Search summary</p><h3 className="mt-2 font-display text-lg font-semibold text-[#eae5d4]">The sample at a glance.</h3></div>
        <span className={`rounded-full border px-2.5 py-1 font-mono-ui text-[9px] tracking-wider ${analysis.source === 'live-oriane' ? 'border-[#4ea49a]/35 text-[#80cfc4]' : 'border-[#b89850]/35 text-[#d8bd70]'}`}>{source}</span>
      </div>
       {trace?.partial && <p className="mb-4 rounded-md border border-[#d9b85e]/35 bg-[#d9b85e]/10 p-3 text-xs font-semibold text-[#e6cd92]">PARTIAL SEARCH · COVERAGE INCOMPLETE</p>}
       <div className="grid grid-cols-2 gap-x-4 gap-y-6">
        {stats.map(({ label, value, detail, icon: Icon }) =>
           <div key={label} className="border-t border-[#e0dac5]/15 pt-3">
             <Icon size={15} className="mb-3 text-[#c5a65d]" aria-hidden="true" />
            <p className="label text-[9px]">{label}</p>
             <p data-testid={`text-summary-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`} className="mt-1.5 truncate font-editorial text-3xl text-[#eee8d7]" title={value}>{value}</p>
            <p className="mt-1 text-[10px] text-[#777b88]">{detail}</p>
          </div>
        )}
      </div>
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#d9b85e]/15 bg-[#d9b85e]/[.045] px-4 py-3">
        <MessageCircleMore size={15} className="mt-0.5 shrink-0 text-[#d9b85e]" aria-hidden="true" />
        <div><p className="label text-[9px]">Top recurring content angle</p>
          <p data-testid="text-summary-top-angle" className="mt-1 text-sm font-semibold text-[#e4decd]">{insights.topAngle ? `${insights.topAngle.label} · ${insights.topAngle.count}/${insights.count} videos` : 'No recurring angle established'}</p>
          <p className="mt-1 text-[10px] leading-4 text-[#81838d]">Broad caption/opening theme, not a verified match to the proposed hook.</p>
        </div>
      </div>
    </div>
  );
}

export function Methodology({ analysis, insights }: { analysis: Analysis; insights: EvidenceInsights }) {
  const trace = analysis.trace as (NonNullable<Analysis['trace']> & { capped?: number; displayed?: number }) | undefined;
  const lowExcluded = trace?.excluded ?? analysis.evidence.filter(record => record.usedForScoring === false && record.relevanceLevel === 'low').length;
  const capped = trace?.capped ?? analysis.evidence.filter(record => record.usedForScoring === false && record.relevanceLevel !== 'low').length;
  return (
    <div data-testid="panel-methodology" className="panel-soft rounded-2xl p-5 md:p-6">
      <div className="flex items-start gap-3">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#67b6a8]" aria-hidden="true" />
        <div>
          <p className="eyebrow">Method / limits</p>
          <h3 className="mt-2 font-display text-base font-semibold text-[#e9e5d6]">Decision support, not a prediction.</h3>
          <p className="mt-2 text-xs leading-6 text-[#a4a6ae]">
            PreFlight evaluates creative fit using evidence-backed heuristics. The five cards show the data behind each signal; reach and engagement are observed video metrics, not forecasts of ad performance. A higher Saturation Risk means more overlap, not a stronger idea.
          </p>
          <p className="mt-2 text-[11px] leading-5 text-[#80838e]">
            {analysis.source === 'live-oriane'
              ? `${insights.count} Oriane video${insights.count === 1 ? '' : 's'} scored; ${lowExcluded} low-relevance excluded; ${capped} relevant beyond scoring cap. ${trace?.retrieved ?? analysis.evidence.length} unique retrieved; ${trace?.displayed ?? analysis.evidence.length} displayed. The search pool is larger than the bounded scoring and browsing sample. No comparable videos never becomes demo evidence. Scores are directional, not guarantees.`
              : 'Oriane was unavailable for this run. The evidence and metrics are illustrative, not live observations; scores are directional and not guarantees.'}
          </p>
        </div>
      </div>
    </div>
  );
}