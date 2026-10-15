import { Fragment, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  ExternalLink,
  FileText,
  FlaskConical,
  Info,
  Layers3,
  Lightbulb,
  Menu,
  Play,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import { searchPreflight } from '@workspace/api-client-react';
import { type Analysis, type Brief, type VideoEvidence, buildAnalysis, buildLiveAnalysis, recordText, DEMO_BRIEF, DISCLAIMER } from '@/lib/preflight';
import { deriveEvidenceInsights, type EvidenceInsights } from '@/lib/insights';
import { SearchSummary, Methodology } from '@/components/CockpitSummary';
import { LiveAnalytics } from '@/components/LiveAnalytics';
import { EvidenceCreativeLab } from '@/components/EvidenceCreativeLab';
import { OpportunityMap, SignalTimeline } from '@/components/OpportunityMap';

const scoredEvidence = (analysis: Analysis) => analysis.evidence.filter(record => record.usedForScoring !== false);
const originalLink = (url?: string) => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch { return null; }
};
function EvidenceStatus({ record }: { record: VideoEvidence }) {
  const lowExcluded = record.usedForScoring === false && record.relevanceLevel === 'low';
  const status = record.usedForScoring !== false ? 'USED IN SCORE' : lowExcluded ? 'EXCLUDED LOW RELEVANCE' : 'SUPPORTING / NOT SCORED';
  return <div className="flex flex-wrap gap-1.5 font-mono-ui text-[9px] font-semibold tracking-wide">
    <span className={`rounded border px-2 py-1 ${record.relevanceLevel === 'low' ? 'border-[#c8905a]/30 text-[#ddb287]' : 'border-[#68ad9e]/30 text-[#a4d5ca]'}`}>
      {record.relevanceScore === undefined ? 'RELEVANCE NOT ASSESSED' : `${record.relevanceLevel?.toUpperCase() || 'HEURISTIC'} RELEVANCE · ${record.relevanceScore}% MATCH`}
    </span>
    <span className={`rounded border px-2 py-1 ${lowExcluded ? 'border-[#c8905a]/30 text-[#ddb287]' : 'border-[#d9b85e]/30 text-[#e0ca92]'}`}>{status}</span>
  </div>;
}

function SearchTrace({ analysis }: { analysis: Analysis }) {
  const trace = analysis.trace as (NonNullable<Analysis['trace']> & { capped?: number; displayed?: number }) | undefined;
  if (!trace) return null;
  return <details data-testid="panel-search-trace" className="panel-soft group rounded-xl p-5">
    <summary data-testid="button-search-trace" className="flex cursor-pointer list-none items-center justify-between gap-4 font-mono-ui text-xs font-semibold tracking-[.12em] text-[#dcc689]">SEARCH TRACE <ChevronDown size={16} className="transition-transform group-open:rotate-180" /></summary>
    <p className="mt-3 text-xs leading-5 text-[#a8aaa6]">What PreFlight asked Oriane. Focused search intents, not a transcript of private requests.</p>
    <div className="mt-4 flex flex-wrap gap-2">{trace.intents.map((intent, index) => <span key={`${intent}-${index}`} className="rounded-md border border-[#d9b85e]/20 bg-[#d9b85e]/[.05] px-3 py-2 text-xs text-[#e1dccb]">{intent}</span>)}</div>
    <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#e0dac5]/10 pt-4 sm:grid-cols-3 lg:grid-cols-5">
      {([['Unique retrieved', trace.retrieved], ['Used in score', trace.used], ['Low relevance excluded', trace.excluded], ['Relevant beyond scoring cap', trace.capped ?? 0], ['Displayed records', trace.displayed ?? analysis.evidence.length]] as const).map(([label, value]) => <div key={label}><p className="label text-[9px]">{label}</p><p className="mt-1 font-editorial text-2xl text-[#eee5d0]">{value}</p></div>)}
    </div>
    <p className="mt-3 text-xs leading-5 text-[#a8aaa6]">Counts differ: retrieved is the unique search pool; scoring uses a bounded relevant sample. Relevant results above the scoring cap are supporting, not low-relevance exclusions. Only a bounded set is displayed for browsing.</p>
    {trace.partial && <p className="mt-3 rounded-lg border border-[#d9b85e]/35 bg-[#d9b85e]/10 p-3 text-xs font-semibold text-[#ead09b]">PARTIAL SEARCH · COVERAGE INCOMPLETE. Some search intents did not complete; use this decision with extra caution.</p>}
  </details>;
}

const navItems = [
  { label: 'Cockpit', target: 'cockpit' },
  { label: 'Opportunity', target: 'opportunity' },
  { label: 'Evidence', target: 'evidence' },
  { label: 'Creative Lab', target: 'creative-lab' },
];

const loadingStages = ['Understanding the concept', 'Searching Oriane video intelligence', 'Comparing creative patterns', 'Measuring saturation and performance', 'Building the recommendation'];

function FieldLabel({ children, htmlFor, required = false }: { children: string; htmlFor: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="label mb-2 block">
      {children}{required && <span className="ml-1 text-[#d9b85e]" aria-hidden="true">*</span>}
    </label>
  );
}

function SourceBadge({ compact = false, source = 'demo-illustrative' }: { compact?: boolean; source?: Analysis['source'] }) {
  const live = source === 'live-oriane';
  return (
    <span data-testid={live ? 'badge-live-oriane' : 'badge-training-illustrative'} className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 font-mono-ui text-[9px] font-medium tracking-[.12em] ${live ? 'border-[#4ea49a]/45 bg-[#4ea49a]/10 text-[#73c9bd]' : 'border-[#9a7e3b]/45 bg-[#957633]/10 text-[#d8bd70]'} ${compact ? 'text-[8px]' : ''}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-[#4ea49a]' : 'bg-[#d9b85e]'}`} />
      {live ? 'LIVE ORIANE EVIDENCE' : 'DEMO / ILLUSTRATIVE'}
    </span>
  );
}

function SectionHeader({ index, eyebrow, title, detail }: { index: string; eyebrow: string; title: string; detail: string }) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <span className="font-mono-ui text-xs text-[#887442]">{index}</span>
      <div>
        <p className="eyebrow mb-2">{eyebrow}</p>
        <h2 className="font-display text-2xl font-semibold tracking-[-.03em] text-[#f1eddd] md:text-3xl">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8e909b]">{detail}</p>
      </div>
    </div>
  );
}

function BriefPanel({ brief, setBrief, onRun, onLoadDemo, onReset, loading }: {
  brief: Brief;
  setBrief: (next: Brief) => void;
  onRun: () => void;
  onLoadDemo: () => void;
  onReset: () => void;
  loading: boolean;
}) {
  const [touched, setTouched] = useState(false);
  const missing = !brief.brand.trim() || !brief.market.trim() || !brief.audience.trim() || !brief.concept.trim();
  const update = (key: keyof Brief, value: string) => setBrief({ ...brief, [key]: value } as Brief);
  return (
    <section id="cockpit" className="scroll-mt-24">
      <div className="mb-5 flex items-center gap-4"><span className="font-mono-ui text-xs text-[#d2ae65]">01 / INTAKE</span><span className="h-px flex-1 bg-[#d9b85e]/25" /><span className="font-mono-ui text-[10px] text-[#818a85]">THE CREATIVE BRIEF</span></div>
      <div className="intake-shell p-5 md:p-8 lg:p-10">
        <div className="mb-6 flex flex-col gap-4 border-b border-[#e0dac5]/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#d9b85e]/10 text-[#d9b85e]"><FileText size={17} /></div>
            <div>
              <p className="font-display text-sm font-semibold text-[#e7e2d0]">Concept intake</p>
              <p className="mt-0.5 text-xs text-[#80838e]">Oriane search · server-side connection</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button data-testid="button-load-demo" type="button" onClick={onLoadDemo} className="btn-secondary inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold"><Sparkles size={13} /> Load Demo Concept</button>
            <button data-testid="button-reset-demo" type="button" onClick={() => { onReset(); setTouched(false); }} className="btn-secondary inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold"><RotateCcw size={13} /> Reset</button>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel htmlFor="brand" required>Brand</FieldLabel>
            <input data-testid="input-brand" id="brand" value={brief.brand} onChange={(e) => update('brand', e.target.value)} onBlur={() => setTouched(true)} className="input-shell px-3.5 py-3 text-sm" placeholder="e.g. CeraVe" aria-invalid={touched && !brief.brand.trim()} />
            {touched && !brief.brand.trim() && <p className="mt-1.5 text-xs text-[#df887c]">Brand is required.</p>}
          </div>
          <div>
            <FieldLabel htmlFor="market" required>Market</FieldLabel>
            <input data-testid="input-market" id="market" value={brief.market} onChange={(e) => update('market', e.target.value)} onBlur={() => setTouched(true)} className="input-shell px-3.5 py-3 text-sm" placeholder="e.g. UAE" aria-invalid={touched && !brief.market.trim()} />
            {touched && !brief.market.trim() && <p className="mt-1.5 text-xs text-[#df887c]">Market is required.</p>}
          </div>
          <div>
            <FieldLabel htmlFor="audience" required>Target audience</FieldLabel>
            <input data-testid="input-audience" id="audience" value={brief.audience} onChange={(e) => update('audience', e.target.value)} onBlur={() => setTouched(true)} className="input-shell px-3.5 py-3 text-sm" placeholder="Who should recognize themselves?" aria-invalid={touched && !brief.audience.trim()} />
            {touched && !brief.audience.trim() && <p className="mt-1.5 text-xs text-[#df887c]">Target audience is required.</p>}
          </div>
          <div>
            <FieldLabel htmlFor="goal">Campaign goal</FieldLabel>
            <div className="relative">
              <select data-testid="select-campaign-goal" id="goal" value={brief.goal} onChange={(e) => update('goal', e.target.value)} className="input-shell appearance-none px-3.5 py-3 text-sm">
                <option>Product Launch</option><option>Awareness</option><option>Conversion</option><option>Education</option><option>Creator Campaign</option>
              </select>
              <ChevronDown size={15} className="pointer-events-none absolute right-3 top-3.5 text-[#8e909b]" />
            </div>
          </div>
          <div className="md:col-span-2">
            <FieldLabel htmlFor="concept" required>Video concept</FieldLabel>
            <textarea data-testid="input-video-concept" id="concept" value={brief.concept} onChange={(e) => update('concept', e.target.value)} onBlur={() => setTouched(true)} rows={4} className="input-shell resize-none px-3.5 py-3 text-sm leading-6" placeholder="Describe the first beat, the story, and the role of the product." aria-invalid={touched && !brief.concept.trim()} />
            {touched && !brief.concept.trim() && <p className="mt-1.5 text-xs text-[#df887c]">A video concept is required.</p>}
          </div>
        </div>
        <div className="mt-7 flex flex-col gap-3 border-t border-[#e0dac5]/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-xs text-[#7e818d]"><ShieldCheck size={14} className="text-[#4ea49a]" /> Server-side Oriane search · deterministic scoring</p>
          <button data-testid="button-run-preflight" type="button" onClick={() => { setTouched(true); if (!missing) onRun(); }} disabled={loading} className="btn-primary inline-flex items-center justify-center gap-4 px-8 py-4 font-mono-ui text-xs font-bold tracking-[.16em] disabled:cursor-wait disabled:opacity-60">
            {loading ? <><Clock3 size={16} className="animate-pulse" /> ANALYZING</> : <>RUN PREFLIGHT <ArrowUpRight size={18} /></>}
          </button>
        </div>
      </div>
    </section>
  );
}

function LoadingState({ step }: { step: number }) {
  return (
    <div data-testid="status-analysis-loading" className="border-t border-[#d9b85e]/50 bg-[#1a201f] p-7 md:p-12">
      <div className="mb-8 flex items-center gap-3"><div className="h-2 w-2 animate-pulse rounded-full bg-[#d9b85e]" /><p className="font-mono-ui text-xs uppercase tracking-[.15em] text-[#d9b85e]">PreFlight / Analysis in progress</p></div>
      <h2 className="mb-10 font-editorial text-4xl text-[#e9ddc2] md:text-6xl">Finding the signal<br /><em>before the shoot.</em></h2>
      <div className="mb-9 h-px bg-[#d9b85e]/20"><div className="h-px bg-[#d9b85e] transition-[width] duration-500" style={{ width: `${(step + 1) / loadingStages.length * 100}%` }} /></div>
      <div className="grid gap-4 md:grid-cols-5">
        {loadingStages.map((stage, index) => (
          <div key={stage} className={`flex items-center gap-4 text-sm ${index <= step ? 'text-[#e8e3d2]' : 'text-[#565a67]'}`}>
            <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] ${index < step ? 'border-[#4ea49a] bg-[#4ea49a]/15 text-[#73c9bd]' : index === step ? 'border-[#d9b85e] text-[#d9b85e]' : 'border-[#343846]'}`}>{index < step ? <Check size={13} /> : `0${index + 1}`}</span>
            <span className={index === step ? 'loading-line' : ''}>{stage}</span>
            {index === step && <span className="ml-auto font-mono-ui text-[10px] text-[#8caa9c]">working</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

const signalMeaning: Record<Analysis['signals'][number]['name'], string> = {
  'Performance Signal': 'Shows how the observed sample performed, not how this concept will perform.',
  'Saturation Risk': 'Higher means more comparable openings in the retrieved sample.',
  'Hook Freshness': 'Measures distinctness only where a comparable opening was found.',
  'Creator Diversity': 'A wider creator mix reduces reliance on one voice.',
  'Evidence Strength': 'Rewards sample size, usable fields, and comparable creative evidence.',
};

function SignalCard({ signal, source, count }: { signal: AnalysisSignal; source: Analysis['source']; count: number }) {
  const isRisk = signal.name === 'Saturation Risk' || signal.direction === 'risk';
  return (
    <div data-testid={`card-signal-${signal.name.toLowerCase().replaceAll(' ', '-')}`} className="panel-soft flex h-full flex-col rounded-xl p-4 transition-colors hover:border-[#d9b85e]/25">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-xs font-semibold leading-5 text-[#d9d6c9]">{signal.name}</p>
        <span className={`font-display text-xl font-semibold ${isRisk ? 'text-[#d7a76a]' : 'text-[#e8db9b]'}`}>{signal.score}</span>
      </div>
      <div className="signal-bar mb-3"><div className="signal-fill" style={{ width: `${signal.score}%`, background: isRisk ? 'linear-gradient(90deg, #77523c, #d19a5a)' : undefined }} /></div>
      <p className="mb-2 font-mono-ui text-[9px] tracking-wide text-[#b5aa86]">{isRisk ? 'HIGHER = WORSE' : 'HIGHER = STRONGER'} · {count} SCORED</p>
      <p className="text-[11px] leading-5 text-[#aeb0b1]">{signal.basis}</p>
      <p className="mt-3 border-t border-[#e0dac5]/8 pt-3 text-[11px] leading-5 text-[#b6ad93]"><span className="font-semibold">Why it matters.</span> {signalMeaning[signal.name]}</p>
      <p className="mt-auto pt-3 font-mono-ui text-[9px] tracking-wide text-[#727682]">{source === 'live-oriane' ? `TRACE · ${count} ORIANE VIDEOS` : `TRACE · ${count} ILLUSTRATIVE VIDEOS`} · HEURISTIC</p>
    </div>
  );
}

type AnalysisSignal = ReturnType<typeof buildAnalysis>['signals'][number];

function Decomposition({ analysis }: { analysis: ReturnType<typeof buildAnalysis> }) {
  const entries = Object.entries(analysis.decomposition) as [string, string][];
  const labels: Record<string, string> = { hookType: 'Hook type', contentFormat: 'Content format', category: 'Category', product: 'Product / category', context: 'Setting / context', audience: 'Audience', problem: 'Problem', productRole: 'Product role', tone: 'Tone', expertStyle: 'Expert / creator style', ctaStyle: 'CTA style', structure: 'Creative structure' };
  return (
    <div data-testid="panel-concept-decomposition" className="panel rounded-2xl p-5 md:p-7">
      <div className="mb-5 flex items-center justify-between">
        <div><p className="eyebrow">Concept decomposition</p><h3 className="mt-2 font-display text-lg font-semibold text-[#eae5d4]">The idea, made legible.</h3></div>
        <div className="hidden items-center gap-2 text-[10px] text-[#7e818d] sm:flex"><SlidersHorizontal size={13} /> deterministic parse</div>
      </div>
      <div className="grid gap-x-8 md:grid-cols-2">
        {entries.map(([key, value]) => <div key={key} className="border-t border-[#e0dac5]/10 py-3.5"><p className="label mb-1.5">{labels[key]}</p><p data-testid={`text-decomposition-${key}`} className="text-sm leading-5 text-[#ddd9ca]">{value}</p></div>)}
      </div>
      <p className="mt-4 flex items-center gap-2 border-t border-[#e0dac5]/10 pt-4 text-[11px] text-[#787b87]"><Info size={13} /> Heuristic decomposition. No AI or LLM connection is active.</p>
    </div>
  );
}

function DecisionCard({ analysis }: { analysis: ReturnType<typeof buildAnalysis> }) {
  const [displayScore, setDisplayScore] = useState(analysis.score);
  const count = scoredEvidence(analysis).length;
  const inconclusive = (analysis.decision as string) === 'INCONCLUSIVE' || (analysis.source === 'live-oriane' && count === 0);
  useEffect(() => {
    if (inconclusive) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setDisplayScore(analysis.score); return; }
    setDisplayScore(0);
    let frame = 0;
    const start = performance.now();
    const tick = (time: number) => {
      const progress = Math.min(1, (time - start) / 1050);
      setDisplayScore(Math.round(analysis.score * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [analysis.score, inconclusive]);
  const decisionColor = inconclusive ? '#d6c79e' : analysis.decision === 'REVISE' ? '#d9b85e' : analysis.decision === 'GO' ? '#62c2ad' : '#e18479';
  const nextStep = inconclusive ? 'REFINE BRIEF & SEARCH AGAIN' : analysis.decision === 'GO' ? 'PRODUCE' : analysis.decision === 'REVISE' ? 'TEST' : 'REVISE';
  const recommendation = analysis.source === 'live-oriane' && count === 0
    ? 'No strong comparable evidence found. This readout reflects an evidence gap—not proof of novelty, opportunity, or a weak concept. Refine the brief and search again.'
    : analysis.source === 'live-oriane' && count < 3
    ? `Limited comparable evidence: ${count} scored video${count === 1 ? '' : 's'}. Treat this direction as uncertain; broaden or refine the brief and rerun.`
    : analysis.decision === 'GO'
    ? 'The observed sample supports moving forward. Treat this as a creative signal, not a performance guarantee.'
    : analysis.decision === 'REVISE'
      ? 'Refine the hook or audience angle before production, then run the revised concept again.'
      : 'The current evidence does not support this concept strongly enough. Rework the idea and test again.';
  return (
    <div data-testid="panel-decision" className="score-stage p-6 md:p-10">
      {analysis.trace?.partial && <p className="relative z-10 mb-5 rounded-lg border border-[#d9b85e]/40 bg-[#d9b85e]/10 p-3 text-xs font-semibold text-[#ead09b]">PARTIAL SEARCH · COVERAGE INCOMPLETE. Some Oriane intents did not complete; this decision reflects only the available sample.</p>}
      <div className="flex justify-between gap-4"><p className="eyebrow text-[#d1b472]">PreFlight / Decision instrument</p><span className="font-mono-ui text-[10px] text-[#8c958f]">{inconclusive ? 'NO SCORE ISSUED' : 'HEURISTIC / 100'}</span></div>
      <div className="relative mx-auto mt-12 flex flex-col items-center justify-center gap-8 lg:mt-6 lg:min-h-[485px]">
        <div className="score-orbit">
          <div className="relative z-10 text-center"><span data-testid="text-analysis-score" className="score-number" style={{ color: decisionColor }}>{inconclusive ? '—' : displayScore}</span>{!inconclusive && <span className="ml-3 font-mono-ui text-xs text-[#8d938b]">/100</span>}<span className="mt-5 block font-mono-ui text-[10px] tracking-[.3em] text-[#a9ad9d]">{inconclusive ? 'NO SCORE ISSUED' : 'PREFLIGHT SCORE'}</span><span data-testid="text-analysis-decision" className="mt-2 block font-editorial text-4xl tracking-wide" style={{ color: decisionColor }}>{inconclusive ? 'INCONCLUSIVE' : analysis.decision}</span></div>
        </div>
        <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:block">
          {analysis.signals.map(signal => <div key={signal.name} className="orbit-signal"><p className="font-mono-ui text-[9px] uppercase tracking-wider text-[#969e95]">{signal.name}</p><p className={`mt-1 font-editorial text-3xl ${signal.direction === 'risk' ? 'text-[#d5a879]' : 'text-[#e2d1a5]'}`}>{signal.score}<span className="ml-2 font-mono-ui text-[9px] text-[#949b90]">{signal.direction === 'risk' ? '↑ RISK' : '/ 100'}</span></p></div>)}
        </div>
      </div>
      <div className="relative z-10 mt-6 flex flex-col justify-between gap-4 border-t border-[#d9b85e]/20 pt-5 md:flex-row md:items-center">
        <p className="max-w-2xl text-sm leading-6 text-[#afb5aa]">{recommendation}</p><span data-testid="status-next-step" className="shrink-0 font-mono-ui text-[10px] tracking-widest text-[#8bd2c6]">NEXT STEP / {nextStep}</span>
      </div>
      <p className="mt-3 text-[10px] leading-5 text-[#777f79]">{DISCLAIMER}</p>
    </div>
  );
}

function WhyResult({ analysis, insights }: { analysis: Analysis; insights: EvidenceInsights }) {
  const reasons = [
    ...(analysis.source === 'live-oriane' && insights.count === 0 ? ['No strong comparable evidence found. Freshness and opportunity cannot be inferred from an empty scored sample.'] : analysis.why),
    insights.count
      ? `Metric coverage: ${insights.viewCoverage}/${insights.count} view counts and ${insights.engagementCoverage}/${insights.count} engagement rates were supplied${analysis.source === 'live-oriane' ? ' by Oriane' : ' by the illustrative dataset'}.`
      : 'No evidence metrics were returned, so the recommendation is constrained by missing data.',
    insights.topAngle
      ? `“${insights.topAngle.label}” occurs in ${insights.topAngle.count}/${insights.count} captions or opening transcripts. This is a broad theme, not a verified match to the concept hook.`
      : 'No recurring caption or opening theme was established in this sample.',
  ].slice(0, 5);
  return (
    <div data-testid="panel-why-result" className="panel-soft rounded-2xl p-5 md:p-7">
      <div className="mb-5 flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d9b85e]/10 text-[#d9b85e]"><Lightbulb size={16} /></div><div><p className="eyebrow">Decision trace</p><h3 className="mt-1 font-display text-lg font-semibold">Why this result?</h3></div></div>
      <div className="space-y-4">{reasons.map((reason, index) => <div key={index} className="flex gap-3 text-sm leading-6 text-[#b1b1b8]"><span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#d9b85e]/10 font-mono-ui text-[10px] text-[#d9b85e]">0{index + 1}</span><p>{reason}</p></div>)}</div>
    </div>
  );
}

function EvidenceCard({ record, index, focused, onFocus }: { record: VideoEvidence; index: number; focused: boolean; onFocus: () => void }) {
  const [open, setOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const text = recordText(record);
  const original = originalLink(record.videoUrl);
  const excerpt = text.length > 290 ? `${text.slice(0, 290).trimEnd()}…` : text;
  const metrics: Array<[string, string | undefined]> = [
    ['Views', record.views !== undefined ? `${record.views.toLocaleString()}` : undefined],
    ['Likes', record.likes !== undefined ? `${record.likes.toLocaleString()}` : undefined],
    ['Comments', record.comments !== undefined ? `${record.comments.toLocaleString()}` : undefined],
    ['Shares', record.shares !== undefined ? `${record.shares.toLocaleString()}` : undefined],
    ['Engagement', record.engagementRate !== undefined ? `${record.engagementRate}%` : undefined],
  ];
  return (
    <article id={`evidence-record-${record.id}`} data-testid={`card-evidence-${record.id}`} tabIndex={0} onClick={onFocus} onFocus={onFocus} className={`panel min-w-0 scroll-mt-28 p-5 outline-none transition-colors hover:border-[#d9b85e]/50 focus-visible:border-[#d9b85e] ${focused ? 'evidence-focused' : ''}`}>
      <div className="mb-4 flex items-center justify-between border-b border-[#d9b85e]/15 pb-3 font-mono-ui text-[10px] tracking-[.2em] text-[#c7ad72]"><span>FRAME {String(index + 1).padStart(2, '0')}</span><span>OBSERVED SAMPLE</span></div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          {record.thumbnailUrl
             ? <img src={record.thumbnailUrl} alt={`Video thumbnail from ${record.creator || record.profileHandle || record.platform || 'Oriane'}`} loading="lazy" className="h-24 w-20 shrink-0 bg-[#262a37] object-cover" />
            : <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#514d54] to-[#262a37] font-display text-sm font-semibold text-[#e4d7b5]">{record.creator?.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div>}
          <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-sm font-semibold text-[#eee9d8]">{record.creator || 'Creator not supplied'}</h3><span className="rounded bg-[#e0dac5]/8 px-1.5 py-0.5 font-mono-ui text-[10px] text-[#999ba4]">{record.platform || 'Platform not supplied'}</span></div>{record.profileHandle && record.creator !== `@${record.profileHandle}` && <p className="mt-1 text-xs text-[#a9aaad]">@{record.profileHandle}</p>}<p className="mt-1 text-xs text-[#7d808c]">{record.publishDate || 'Publish date not supplied'} · {record.language || 'Language not supplied'}</p></div>
        </div>
        <SourceBadge compact source={record.source} />
      </div>
      <div className="mt-4"><EvidenceStatus record={record} /></div>
      <div className="mt-5 grid grid-cols-2 gap-2 border-y border-[#e0dac5]/10 py-3 sm:grid-cols-5">
        {metrics.map(([label, value]) => <div key={label} className="min-w-0"><p className="label text-[9px]">{label}</p><p data-testid={`metric-${label.toLowerCase()}-${record.id}`} className="mt-1 truncate font-mono-ui text-xs text-[#d5d1c4]">{value || 'Not supplied'}<span className="ml-1 text-[9px] text-[#767985]">{record.source === 'demo-illustrative' && value && label !== 'Engagement' ? 'ill.' : ''}</span></p></div>)}
      </div>
      <div className="mt-4 rounded-lg bg-[#0f121b]/50 p-3.5"><p className="label mb-2 text-[9px]">Caption / transcript excerpt</p><p className="text-sm leading-6 text-[#b8b6af]">“{excerpt}”</p></div>
      <div className="mt-3 text-[11px] leading-5 text-[#9b9ca2]"><span className="font-semibold text-[#d2c391]">Why matched:</span> {record.match.supported} {record.relevanceReasons?.length ? <span className="block mt-1">Heuristic match: {record.relevanceReasons.join(' · ')}</span> : null}</div>
      <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#777a86]"><span className="font-semibold text-[#9da0a6]">Source:</span> {record.sourceNote}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
         <button data-testid={`button-provenance-${record.id}`} type="button" onClick={() => setOpen(!open)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#d9b85e] hover:text-[#f0d680]">{open ? 'Hide provenance' : 'Why am I seeing this?'} <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} /></button>
          <div className="flex flex-wrap items-center gap-4">
            {original
              ? <a data-testid={`button-original-${record.id}`} href={original} target="_blank" rel="noopener noreferrer" onClick={event => event.stopPropagation()} className="inline-flex min-w-40 items-center justify-center gap-1.5 rounded-md border border-[#68ad9e]/40 bg-[#68ad9e]/10 px-3 py-2 text-xs font-semibold text-[#a9d0c6] hover:text-[#d2eee4]"><ExternalLink size={13} /> OPEN ORIGINAL ↗</a>
              : <button data-testid={`button-original-unavailable-${record.id}`} type="button" disabled title="No verified original video link could be resolved" className="inline-flex min-w-40 cursor-not-allowed items-center justify-center rounded-md border border-[#a8a696]/20 px-3 py-2 text-xs font-semibold text-[#a8a696]/55">ORIGINAL UNAVAILABLE</button>}
            <button data-testid={`button-source-details-${record.id}`} type="button" onClick={(event) => { event.stopPropagation(); setSourceOpen(!sourceOpen); }} aria-expanded={sourceOpen} className="inline-flex items-center gap-1.5 text-xs text-[#a9d0c6] hover:text-[#d2eee4]">SOURCE DETAILS <ChevronDown size={13} /></button>
          </div>
      </div>
      {sourceOpen && <div className="mt-4 border-t border-[#d9b85e]/20 pt-4 text-xs leading-6 text-[#b9b8b0]">
        <p className="mb-2 font-mono-ui text-[10px] font-semibold tracking-wide text-[#d8b975]">{original ? 'ORIGINAL VIDEO LINK VERIFIED' : 'ORIGINAL LINK NOT PROVIDED OR VERIFIED'}</p>
        <dl className="grid gap-x-4 sm:grid-cols-2">{([['Platform', record.platform], ['Creator', record.creator], ['Handle', record.profileHandle ? `@${record.profileHandle}` : undefined], ['Platform content ID', record.platformId], ['Oriane content ID', record.id], ['Published', record.publishDate], ['Relevance', record.relevanceScore === undefined ? undefined : `${record.relevanceScore}% heuristic match`], ['Source provenance', record.sourceNote]] as const).map(([label, value]) => <div key={label} className="min-w-0 border-t border-[#e0dac5]/10 py-1.5"><dt className="label text-[9px]">{label}</dt><dd className="mt-0.5 break-words">{value ?? 'Not supplied'}</dd></div>)}</dl>
      </div>}
      {open && <div data-testid={`panel-provenance-${record.id}`} className="mt-4 border-t border-[#d9b85e]/20 pt-4"><div className="flex items-start gap-2 text-xs leading-5 text-[#b4b0a2]"><CircleHelp size={14} className="mt-0.5 shrink-0 text-[#d9b85e]" /><p><strong className="font-semibold text-[#e2d6af]">Why included / provenance.</strong> Search context: <span className="text-[#e2d6af]">{record.match.category}</span>, <span className="text-[#e2d6af]">{record.match.hook}</span>, and <span className="text-[#e2d6af]">{record.match.format}</span>. {record.match.supported} No unsupported performance claim is inferred.</p></div><p className="mt-3 pl-6 font-mono-ui text-[10px] leading-5 text-[#777a86]">{record.sourceNote} · Record {String(index + 1).padStart(2, '0')}</p>{text.length > 290 && <p className="mt-3 pl-6 text-xs leading-5 text-[#979aa3]"><span className="font-semibold text-[#d7d1be]">Full supplied text:</span> {text}</p>}</div>}
    </article>
  );
}

function EvidenceSection({ analysis, fallbackError }: { analysis: ReturnType<typeof buildAnalysis>; fallbackError: string | null }) {
  const [sortBy, setSortBy] = useState<'relevance' | 'views' | 'engagement' | 'recency'>('relevance');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const focus = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      setPlatformFilter('all');
      setView('cards');
      setFocusedId(id);
      window.setTimeout(() => document.getElementById(`evidence-record-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }), 80);
    };
    window.addEventListener('preflight:focus-evidence', focus);
    return () => window.removeEventListener('preflight:focus-evidence', focus);
  }, []);
  const live = analysis.source === 'live-oriane';
  const trace = analysis.trace as (NonNullable<Analysis['trace']> & { capped?: number; displayed?: number }) | undefined;
  const used = scoredEvidence(analysis).length;
  const lowExcluded = trace?.excluded ?? analysis.evidence.filter(record => record.usedForScoring === false && record.relevanceLevel === 'low').length;
  const capped = trace?.capped ?? analysis.evidence.filter(record => record.usedForScoring === false && record.relevanceLevel !== 'low').length;
  const platforms = [...new Set(analysis.evidence.map((record) => record.platform).filter((platform): platform is string => !!platform))];
  const selectedPlatform = platforms.includes(platformFilter) ? platformFilter : 'all';
  const records = analysis.evidence
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => selectedPlatform === 'all' || record.platform === selectedPlatform)
    .sort((a, b) => {
      const score = sortBy === 'views' ? (b.record.views ?? -1) - (a.record.views ?? -1)
        : sortBy === 'engagement' ? (b.record.engagementRate ?? -1) - (a.record.engagementRate ?? -1)
          : sortBy === 'recency' ? (Date.parse(b.record.publishDate || '') || 0) - (Date.parse(a.record.publishDate || '') || 0)
            : (b.record.relevanceScore ?? -1) - (a.record.relevanceScore ?? -1);
      return score || a.index - b.index;
    });
  return (
    <section id="evidence" className="scroll-mt-24">
      <SectionHeader index="04" eyebrow="Evidence room" title="Show the receipts." detail="Normalized records are presented as evidence, not as a claim of certainty. Every match has a source note." />
      {live
        ? <div data-testid="status-oriane-connected" className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-[#4ea49a]/25 bg-[#4ea49a]/[.07] p-4 text-xs text-[#9dd2c9]"><ShieldCheck size={16} className="shrink-0" /><strong>Oriane Live • Connected</strong><span>· {trace?.retrieved ?? analysis.evidence.length} unique retrieved · {used} scored · {lowExcluded} low relevance excluded · {capped} relevant beyond scoring cap · {trace?.displayed ?? analysis.evidence.length} displayed.</span></div>
        : <div className="mb-5 flex flex-col gap-3 rounded-xl border border-[#bf9d50]/20 bg-[#b8913d]/[.06] p-4 sm:flex-row sm:items-center"><AlertTriangle size={16} className="shrink-0 text-[#d9b85e]" /><div className="text-xs leading-5 text-[#aaa59a]"><strong className="text-[#e1d6ae]">Live evidence unavailable.</strong> {fallbackError || 'Oriane search failed.'} Showing demo fallback only — every record and metric below is training / illustrative.</div></div>}
      {trace?.partial && <div className="mb-5 rounded-xl border border-[#d9b85e]/40 bg-[#d9b85e]/10 p-4 text-xs font-semibold text-[#ead09b]">PARTIAL SEARCH · COVERAGE INCOMPLETE. Some search intents did not complete. Interpret the result with extra caution.</div>}
      {live && used < 3 && <div className="panel mb-5 rounded-xl border-l-2 border-l-[#d9b85e] p-5 text-sm text-[#c6bca6]"><strong className="block text-[#e5d29a]">{used ? 'LIMITED COMPARABLE EVIDENCE' : 'NO STRONG COMPARABLE EVIDENCE FOUND'}</strong><p className="mt-1 text-[#a8aaa6]">A small scored sample does not establish novelty or opportunity. Refine the product, context or audience in your brief and run again. All displayed records remain browsable below.</p></div>}
      {analysis.evidence.length > 0 && <div className="mb-5 flex flex-wrap items-end justify-between gap-4 rounded-xl border border-[#e0dac5]/10 bg-[#171a25]/65 p-4">
        <div className="flex flex-wrap gap-3">
          <label className="label flex flex-col gap-2 text-[10px]">Sort evidence
            <select data-testid="select-evidence-sort" className="input-shell min-w-36 px-3 py-2 text-xs normal-case tracking-normal" value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}>
              <option value="relevance">Search relevance</option><option value="views">Most views</option><option value="engagement">Highest engagement</option><option value="recency">Most recent</option>
            </select>
          </label>
          <label className="label flex flex-col gap-2 text-[10px]">Platform
            <select data-testid="select-evidence-platform" className="input-shell min-w-32 px-3 py-2 text-xs normal-case tracking-normal" value={selectedPlatform} onChange={(event) => setPlatformFilter(event.target.value)}>
              <option value="all">All platforms</option>{platforms.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
            </select>
          </label>
        </div>
        <div className="flex items-center gap-3">
          <span data-testid="text-evidence-count" className="font-mono-ui text-[10px] text-[#90929b]">{records.length} / {analysis.evidence.length} SHOWN</span>
          <div className="flex rounded-lg border border-[#e0dac5]/10 bg-[#10131b] p-1">
            <button data-testid="button-evidence-cards" type="button" aria-pressed={view === 'cards'} onClick={() => setView('cards')} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${view === 'cards' ? 'bg-[#d9b85e]/15 text-[#e4c977]' : 'text-[#81848f] hover:text-[#d9d5c5]'}`}>Cards</button>
            <button data-testid="button-evidence-table" type="button" aria-pressed={view === 'table'} onClick={() => setView('table')} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${view === 'table' ? 'bg-[#d9b85e]/15 text-[#e4c977]' : 'text-[#81848f] hover:text-[#d9d5c5]'}`}>Table</button>
          </div>
        </div>
      </div>}
      {records.length === 0 && analysis.evidence.length > 0 && <p className="panel rounded-xl p-5 text-sm text-[#a6a8ae]">No records match this platform filter. Choose All platforms to see the full sample.</p>}
      {view === 'cards'
         ? <><div className="mb-3 hidden justify-end gap-2 md:flex"><button data-testid="button-film-previous" aria-label="Scroll evidence left" type="button" onClick={() => railRef.current?.scrollBy({ left: -railRef.current.clientWidth * .75, behavior: 'smooth' })} className="btn-secondary rounded-md p-2"><ArrowLeft size={16} /></button><button data-testid="button-film-next" aria-label="Scroll evidence right" type="button" onClick={() => railRef.current?.scrollBy({ left: railRef.current.clientWidth * .75, behavior: 'smooth' })} className="btn-secondary rounded-md p-2"><ArrowRight size={16} /></button></div><div ref={railRef} className="film-rail">{records.map(({ record, index }) => <EvidenceCard key={record.id} record={record} index={index} focused={focusedId === record.id} onFocus={() => setFocusedId(record.id)} />)}</div></>
        : <div data-testid="table-evidence" className="panel overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[920px] text-left text-xs">
            <thead className="border-b border-[#e0dac5]/10 bg-[#11141d] font-mono-ui text-[10px] uppercase tracking-wider text-[#858894]"><tr>
              {['Creator / source', 'Platform', 'Published', 'Views', 'Likes', 'Comments', 'Shares', 'Engagement', 'Relevance / scoring', 'Match'].map((header) => <th scope="col" key={header} className="px-4 py-3 font-medium">{header}</th>)}
            </tr></thead>
            <tbody>{records.map(({ record, index }) => <Fragment key={record.id}>
              <tr data-testid={`row-evidence-${record.id}`} className="border-b border-[#e0dac5]/8 text-[#c7c5bc] hover:bg-[#d9b85e]/[.035]">
                <td className="px-4 py-3"><span className="block max-w-40 truncate font-semibold text-[#e9e3d4]">{record.creator || record.profileHandle || 'Not supplied'}</span><span className="mt-1 block text-[10px] text-[#92949d]">{record.profileHandle ? `@${record.profileHandle}` : 'Handle not supplied'}</span><span className="mt-2 block"><SourceBadge compact source={record.source} /></span></td>
                <td className="px-4 py-3">{record.platform || '—'}</td><td className="px-4 py-3">{record.publishDate || '—'}</td>
                {[record.views, record.likes, record.comments, record.shares].map((value, metricIndex) => <td key={metricIndex} className="px-4 py-3 font-mono-ui">{value === undefined ? '—' : value.toLocaleString()}</td>)}
                <td className="px-4 py-3 font-mono-ui">{record.engagementRate === undefined ? '—' : `${record.engagementRate}%`}</td>
                <td className="px-4 py-3"><EvidenceStatus record={record} /></td>
                <td className="px-4 py-3"><button data-testid={`button-table-provenance-${record.id}`} type="button" onClick={() => setExpandedId(expandedId === record.id ? null : record.id)} className="text-[#d9b85e] hover:text-[#f0d680]">{expandedId === record.id ? 'Hide' : 'Why included?'}</button></td>
              </tr>
              {expandedId === record.id && <tr className="border-b border-[#e0dac5]/10 bg-[#12151f]"><td colSpan={10} className="px-4 py-4 text-xs leading-5 text-[#a7a6a3]"><strong className="text-[#e1d6ae]">Why included:</strong> {record.match.supported} <span className="block mt-1">{record.relevanceReasons?.join(' · ')} · {record.match.category} · {record.match.hook} · {record.match.format}</span><span className="mt-2 block font-mono-ui text-[10px] text-[#777a86]">{record.sourceNote} · Record {String(index + 1).padStart(2, '0')}</span><span className="mt-2 block max-w-3xl">“{recordText(record).slice(0, 260)}{recordText(record).length > 260 ? '…' : ''}”</span>{originalLink(record.videoUrl) ? <a href={originalLink(record.videoUrl) || undefined} target="_blank" rel="noopener noreferrer" className="mt-2 block text-[#9dd2c9]">OPEN ORIGINAL ↗</a> : <button type="button" disabled className="mt-2 block cursor-not-allowed text-[#a8a696]/55">ORIGINAL UNAVAILABLE</button>}</td></tr>}
            </Fragment>)}</tbody>
          </table>
        </div>}
      <div className="mt-5 flex items-center gap-2 text-xs text-[#737681]"><Info size={13} /> {live ? 'Source: Oriane indexed videos · Metrics are observed, not forecasts.' : 'Source: training / illustrative demo records only.'}</div>
    </section>
  );
}

function HowItWorks({ onClose }: { onClose: () => void }) {
  const stages = [
    ['01', 'Concept input', 'Your brief fields', 'YOU'],
    ['02', 'Concept decomposition', 'Hook, format, category, structure', 'HEURISTIC'],
    ['03', 'Video evidence', 'Oriane matched records or labeled demo fallback', 'LIVE / FALLBACK'],
    ['04', 'Evidence normalization', 'Safe optional-field handling', 'HEURISTIC'],
    ['05', 'Deterministic scoring', 'Five signal calculation', 'HEURISTIC'],
    ['06', 'Evidence-backed explanation', 'Decision trace and provenance', 'HEURISTIC'],
    ['07', 'Creative rewrite', 'Hook, script, storyboard', 'HEURISTIC DRAFT'],
  ];
  return (
    <div data-testid="modal-how-it-works" className="fixed inset-0 z-30 flex items-end justify-center bg-[#05060b]/75 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="how-title">
      <div className="max-h-[92dvh] w-full max-w-2xl overflow-auto rounded-t-2xl border border-[#e0dac5]/15 bg-[#171a25] shadow-2xl sm:rounded-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#e0dac5]/10 bg-[#171a25]/95 p-5 backdrop-blur md:p-7"><div><p className="eyebrow">System map</p><h2 id="how-title" className="mt-2 font-display text-2xl font-semibold">How PreFlight works</h2><p className="mt-2 max-w-lg text-sm leading-6 text-[#9698a2]">A transparent path from creative instinct to a better next draft.</p></div><button data-testid="button-close-how-it-works" type="button" onClick={onClose} className="btn-secondary rounded-lg p-2" aria-label="Close How It Works"><X size={17} /></button></div>
        <div className="space-y-1 p-5 md:p-7">{stages.map(([number, name, description, mode], index) => <div key={name} className="relative flex gap-4 pb-4 last:pb-0"><div className="relative flex w-8 shrink-0 justify-center"><span className="z-10 flex h-7 w-7 items-center justify-center rounded-full border border-[#d9b85e]/35 bg-[#252331] font-mono-ui text-[10px] text-[#d9b85e]">{number}</span>{index < stages.length - 1 && <span className="absolute top-7 h-full w-px bg-[#d9b85e]/15" />}</div><div className="flex flex-1 items-center justify-between gap-4 rounded-lg border border-[#e0dac5]/8 bg-[#11141d]/55 px-4 py-3"><div><p className="text-sm font-semibold text-[#dad6c7]">{name}</p><p className="mt-1 text-xs text-[#777a86]">{description}</p></div><span className="shrink-0 font-mono-ui text-[9px] tracking-[.08em] text-[#b29a5b]">{mode}</span></div></div>)}</div>
        <div className="mx-5 mb-5 border-l-2 border-[#d9b85e] bg-[#101715] p-5 text-xs leading-6 text-[#aeb5a8] md:mx-7 md:mb-7"><p className="font-editorial text-2xl text-[#e9dfc8]">The limits are part of the method.</p><p className="mt-2">PreFlight does not predict guaranteed campaign performance. It provides evidence-backed creative decision support. Evidence is Oriane Live when available, otherwise labeled illustrative fallback; calculations are heuristic and rewrites are deterministic drafts, not generated by Oriane or an LLM.</p></div>
      </div>
    </div>
  );
}

function EmptyAnalysis({ onDemo }: { onDemo: () => void }) {
  return <div data-testid="status-analysis-empty" className="panel rounded-2xl p-8 text-center md:p-14"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d9b85e]/20 bg-[#d9b85e]/[.08] text-[#d9b85e]"><Target size={24} /></div><h2 className="mt-5 font-display text-xl font-semibold text-[#e8e3d2]">Your decision room is quiet.</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#858894]">Load the demo concept or write your own brief. PreFlight will keep every assumption visible.</p><button data-testid="button-empty-load-demo" type="button" onClick={onDemo} className="btn-secondary mt-6 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold"><Sparkles size={14} /> Load demo brief</button></div>;
}

function App() {
  const [brief, setBrief] = useState<Brief>(DEMO_BRIEF);
  const [analysis, setAnalysis] = useState<ReturnType<typeof buildAnalysis> | null>(null);
  const [analysisBrief, setAnalysisBrief] = useState<Brief>(DEMO_BRIEF);
  const [fallbackError, setFallbackError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [howOpen, setHowOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [presentation, setPresentation] = useState(false);
  const [presentationStep, setPresentationStep] = useState(0);
  const activeRun = useRef<AbortController | null>(null);
  const presentationLabels = ['Concept', 'PreFlight Decision', 'Opportunity Map', 'Evidence', 'Make It Better'];
  useEffect(() => {
    const showEvidence = () => { if (presentation) setPresentationStep(3); };
    window.addEventListener('preflight:focus-evidence', showEvidence);
    return () => window.removeEventListener('preflight:focus-evidence', showEvidence);
  }, [presentation]);
  useEffect(() => {
    if (!presentation) return;
    const onKey = (event: KeyboardEvent) => {
      if (howOpen || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      if (event.key === 'ArrowRight') setPresentationStep(current => Math.min(4, current + 1));
      if (event.key === 'ArrowLeft') setPresentationStep(current => Math.max(0, current - 1));
      if (event.key === 'Escape') setPresentation(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [presentation, howOpen]);
  useEffect(() => { if (presentation) window.scrollTo({ top: 0, behavior: 'instant' }); }, [presentation, presentationStep]);

  const cancelRun = () => {
    activeRun.current?.abort();
    activeRun.current = null;
    setLoading(false);
  };
  const run = async () => {
    const snapshot = { ...brief };
    cancelRun();
    const controller = new AbortController();
    activeRun.current = controller;
    setAnalysis(null);
    setFallbackError(null);
    setStep(0);
    setLoading(true);
    if (presentation) setPresentationStep(1);
    else window.setTimeout(() => document.getElementById('decision')?.scrollIntoView({ behavior: 'smooth' }), 30);
    const timer = window.setInterval(() => setStep((current) => Math.min(current + 1, loadingStages.length - 1)), 750);
    try {
      const response = await searchPreflight(snapshot, { signal: controller.signal });
      if (!controller.signal.aborted) {
        setAnalysisBrief(snapshot);
        setAnalysis(buildLiveAnalysis(snapshot, response.evidence as VideoEvidence[], response.trace));
      }
    } catch {
      if (!controller.signal.aborted) {
        setAnalysisBrief(snapshot);
        setFallbackError('The Oriane search could not complete.');
        setAnalysis(buildAnalysis(snapshot));
      }
    } finally {
      window.clearInterval(timer);
      if (activeRun.current === controller) {
        activeRun.current = null;
        setLoading(false);
      }
    }
  };
  const loadDemo = () => { cancelRun(); setBrief(DEMO_BRIEF); setAnalysis(null); setFallbackError(null); setPresentationStep(0); window.setTimeout(() => document.getElementById('cockpit')?.scrollIntoView({ behavior: 'smooth' }), 0); };
  const reset = () => { cancelRun(); setBrief(DEMO_BRIEF); setAnalysis(null); setFallbackError(null); setStep(0); setPresentationStep(0); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const jump = (target: string) => { if (presentation) setPresentationStep(({ cockpit: 0, decision: 1, opportunity: 2, evidence: 3, 'creative-lab': 4 } as Record<string, number>)[target] ?? 0); else document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' }); setMenuOpen(false); };
  const insights = analysis ? deriveEvidenceInsights(scoredEvidence(analysis)) : null;

  return (
    <div className={`app-shell min-h-[100dvh] ${presentation ? 'presentation-mode' : ''}`}>
      <header className="sticky top-0 z-20 border-b border-[#e0dac5]/10 bg-[#0d1018]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-3 sm:px-6 lg:px-10">
          <button data-testid="button-brand-home" type="button" onClick={() => jump('cockpit')} className="flex items-center gap-2.5 text-left">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d9b85e]/45 bg-[#d9b85e]/10 text-[#e1c46c]"><FlaskConical size={16} /></div>
            <div><div className="font-display text-sm font-bold tracking-[-.02em] text-[#f0ebda]">PreFlight <span className="text-[#d9b85e]">AI</span></div><div className="hidden font-mono-ui text-[9px] tracking-[.1em] text-[#70737e] sm:block">CREATIVE INTELLIGENCE WORKSPACE</div></div>
          </button>
          <nav className={`${menuOpen ? 'absolute left-0 right-0 top-full flex border-b border-[#e0dac5]/10 bg-[#11141d] p-3' : 'hidden'} flex-col gap-1 sm:static sm:flex sm:flex-row sm:border-0 sm:bg-transparent sm:p-0`} aria-label="Primary navigation">
            {navItems.map((item) => <button data-testid={`nav-${item.target}`} type="button" key={item.target} onClick={() => jump(item.target)} className="rounded-md px-3 py-2 text-left text-xs font-semibold text-[#8f919d] transition-colors hover:bg-[#e0dac5]/6 hover:text-[#ece6d5] sm:text-center">{item.label}</button>)}
            <button data-testid="nav-how-it-works" type="button" onClick={() => { setHowOpen(true); setMenuOpen(false); }} className="rounded-md px-3 py-2 text-left text-xs font-semibold text-[#d9b85e] transition-colors hover:bg-[#d9b85e]/10 sm:text-center">How It Works</button>
          </nav>
           <div className="flex items-center gap-3"><div data-testid="status-local-workspace" className="hidden items-center gap-2 text-[10px] text-[#a7b1a6] lg:flex"><span className={`h-1.5 w-1.5 rounded-full ${analysis?.source === 'live-oriane' ? 'bg-[#4ea49a]' : 'bg-[#d9b85e]'}`} /> {analysis?.source === 'live-oriane' ? 'Oriane Live • Connected' : analysis ? 'Oriane • Fallback Mode' : 'Oriane • Ready to search'}</div><button data-testid="button-presentation-mode" type="button" onClick={() => { setPresentation(!presentation); setPresentationStep(0); }} className="border border-[#d9b85e]/40 px-3 py-2 font-mono-ui text-[9px] tracking-wider text-[#dfc47f] transition-colors hover:bg-[#d9b85e]/10">{presentation ? 'EXIT PRESENTATION' : 'PRESENTATION MODE'}</button><button data-testid="button-mobile-menu" type="button" onClick={() => setMenuOpen(!menuOpen)} className="btn-secondary rounded-md p-2 sm:hidden" aria-label="Toggle navigation menu">{menuOpen ? <X size={16} /> : <Menu size={16} />}</button></div>
        </div>
      </header>
       <main className="mx-auto max-w-[1440px] px-4 pb-28 pt-9 sm:px-6 lg:px-10 lg:pt-12">
         <div className="space-y-24">
          <div className={`presentation-slide ${presentationStep === 0 ? 'is-current' : ''}`}>
           <div className="mb-12 grid gap-9 lg:grid-cols-[1.55fr_.45fr] lg:items-end">
             <div className="reveal"><div className="eyebrow mb-7 flex items-center gap-3 text-[#ccb378]"><span className="h-px w-9 bg-[#d9b85e]" /> PREFLIGHT AI / PRE-PRODUCTION INTELLIGENCE <span className="text-[#717c76]">01 — 05</span></div><h1 className="hero-title max-w-5xl text-[#f0ecde]">Make the idea<br /><em>earn its shoot.</em></h1><p className="mt-8 max-w-xl text-base leading-7 text-[#adb4aa]">Pressure-test a video concept against real video intelligence before production.</p></div>
             <div className="hero-side reveal reveal-2 mb-3"><span className="font-mono-ui text-[10px] tracking-widest text-[#d6b46d]">THE DECISION BEFORE THE PRODUCTION</span><p className="mt-5 font-editorial text-3xl leading-tight text-[#e5dfce]">Creative instinct,<br />met with evidence.</p><p className="mt-5 text-xs leading-6 text-[#8f998e]">One brief. Five signals. A decision you can defend in the room.</p><div className="mt-7 flex gap-7 border-t border-[#d9b85e]/20 pt-4 font-mono-ui text-[9px] tracking-widest text-[#8d9c91]"><span>05 SIGNALS</span><span>01 DECISION</span></div></div>
           </div>
          <BriefPanel brief={brief} setBrief={setBrief} onRun={run} onLoadDemo={loadDemo} onReset={reset} loading={loading} />
          </div>
          <div className={`presentation-slide ${presentationStep === 1 ? 'is-current' : ''}`} id="decision">
           {loading ? <LoadingState step={step} /> : analysis && insights ? <>
               <section className="space-y-8">
                 <SectionHeader index="02" eyebrow="Decision room" title="The readout." detail="Five signals build a defensible recommendation. They are directional heuristics, not a forecast." />
                 <DecisionCard analysis={analysis} />
                 <div className="grid gap-5 lg:grid-cols-[1fr_1fr]"><Decomposition analysis={analysis} /><SearchSummary analysis={analysis} insights={insights} /></div>
                 <SearchTrace analysis={analysis} />
                 <WhyResult analysis={analysis} insights={insights} />
                 <div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-display text-lg font-semibold text-[#eae5d4]">Five signals</h3>
                    <p className="text-[11px] text-[#858894]">{analysis.source === 'live-oriane' ? 'Oriane observed metrics · heuristic scores' : 'Training / illustrative · heuristic scores'}</p>
                  </div>
                   <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {analysis.signals.map((signal) => <SignalCard key={signal.name} signal={signal} source={analysis.source} count={scoredEvidence(analysis).length} />)}
                  </div>
                </div>
                 <Methodology analysis={analysis} insights={insights} />
              </section>
             </> : <EmptyAnalysis onDemo={loadDemo} />}
          </div>
          {analysis && insights && !loading && <>
            <div className={`presentation-slide ${presentationStep === 2 ? 'is-current' : ''}`}><OpportunityMap analysis={analysis} /><div className="mt-16"><SignalTimeline analysis={analysis} /></div></div>
            <div className={`presentation-slide ${presentationStep === 3 ? 'is-current' : ''}`}><div className="mb-16">{(!presentation || presentationStep === 3) && <LiveAnalytics analysis={analysis} insights={insights} />}</div><EvidenceSection analysis={analysis} fallbackError={fallbackError} /></div>
            <div className={`presentation-slide ${presentationStep === 4 ? 'is-current' : ''}`}><EvidenceCreativeLab brief={analysisBrief} analysis={analysis} insights={insights} /></div>
          </>}
        </div>
         <footer className="presentation-hide mt-20 border-t border-[#e0dac5]/10 pt-5"><div className="flex flex-col gap-3 text-[11px] leading-5 text-[#6f727e] sm:flex-row sm:items-center sm:justify-between"><p>{DISCLAIMER}</p><button data-testid="button-footer-how-it-works" type="button" onClick={() => setHowOpen(true)} className="inline-flex items-center gap-1.5 text-[#a68d52] hover:text-[#d9b85e]">Read the method <ArrowUpRight size={12} /></button></div></footer>
      </main>
       {presentation && <div className="presentation-controls flex items-center gap-3 px-4 py-3 sm:gap-6"><span className="font-mono-ui text-[10px] text-[#d9b85e]">{String(presentationStep + 1).padStart(2, '0')} / 05</span><span className="min-w-0 flex-1 truncate font-editorial text-xl text-[#eee5cf] sm:text-2xl">{presentationLabels[presentationStep]}</span><button data-testid="button-presentation-previous" disabled={presentationStep === 0} onClick={() => setPresentationStep(n => n - 1)} className="font-mono-ui text-[10px] text-[#d9c796] disabled:opacity-30">PREVIOUS</button><button data-testid="button-presentation-next" disabled={presentationStep === 4 || (!analysis && presentationStep === 1)} onClick={() => setPresentationStep(n => n + 1)} className="border border-[#d9b85e]/30 px-3 py-2 font-mono-ui text-[10px] text-[#e2c57d] disabled:opacity-30">NEXT →</button></div>}
      {howOpen && <HowItWorks onClose={() => setHowOpen(false)} />}
    </div>
  );
}

export default App;