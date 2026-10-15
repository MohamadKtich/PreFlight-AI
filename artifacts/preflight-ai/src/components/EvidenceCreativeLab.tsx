import { useState } from 'react';
import { Info, Lightbulb } from 'lucide-react';
import type { Analysis, Brief } from '@/lib/preflight';
import type { EvidenceInsights } from '@/lib/insights';
import { buildCreativeRewrite } from '@/lib/creative';

type LabView = 'hook' | 'script' | 'storyboard';

export function EvidenceCreativeLab({ brief, analysis, insights }: { brief: Brief; analysis: Analysis; insights: EvidenceInsights }) {
  const [view, setView] = useState<LabView>('hook');
  const rewrite = buildCreativeRewrite(brief, analysis, insights);
  const rationale = view === 'hook' ? rewrite.hookRationale : view === 'script' ? rewrite.scriptRationale : rewrite.storyboardRationale;
  return (
    <section id="creative-lab" className="scroll-mt-24">
      <div className="mb-8 flex items-start gap-4">
        <span className="font-mono-ui text-xs text-[#887442]">05</span>
        <div>
          <p className="eyebrow mb-2">Make it better</p>
           <h2 className="font-editorial text-5xl tracking-[-.03em] text-[#f1eddd] md:text-7xl">Make it better.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8e909b]">A deterministic rewrite guided by the brief and the actual Oriane sample where it supports an insight. No LLM or performance guarantee.</p>
        </div>
      </div>
      <div className="panel overflow-hidden border-t-[#d9b85e]/50">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e0dac5]/10 p-5 md:p-6">
          <div><p className="label mb-2">Rewrite workspace</p><h3 className="font-display text-xl font-semibold text-[#ede8d8]">{brief.brand || 'Your brand'} · revised concept</h3></div>
          <span data-testid="status-rewrite-guidance" className={`rounded-full border px-2.5 py-1 font-mono-ui text-[9px] tracking-wider ${insights.count ? 'border-[#4ea49a]/40 bg-[#4ea49a]/10 text-[#80cfc4]' : 'border-[#b89850]/40 bg-[#b89850]/10 text-[#d8bd70]'}`}>{rewrite.guidanceLabel}</span>
        </div>
        <div className="flex gap-2 border-b border-[#e0dac5]/10 bg-[#11141d]/40 px-5 py-3 text-[11px] leading-5 text-[#a1a4a9] md:px-6"><Info size={14} className="mt-0.5 shrink-0 text-[#d9b85e]" /><p data-testid="text-rewrite-evidence-note">{rewrite.evidenceNote}</p></div>
        <div className="mobile-scroll flex gap-1 border-b border-[#e0dac5]/10 px-5 pt-3 md:px-6">
          {(['hook', 'script', 'storyboard'] as LabView[]).map((item) => <button data-testid={`tab-creative-${item}`} key={item} type="button" onClick={() => setView(item)} aria-selected={view === item} className={`shrink-0 border-b-2 px-3 pb-3 text-xs font-bold capitalize tracking-wide transition-colors ${view === item ? 'border-[#d9b85e] text-[#e6d18a]' : 'border-transparent text-[#777a86] hover:text-[#bbb8ab]'}`}>{item}</button>)}
        </div>
        <div className="p-5 md:p-7">
           {view === 'hook' && <div className="space-y-5">
              <div className="border-t border-[#e0dac5]/20 bg-[#111817] p-5 md:p-6"><p className="eyebrow mb-3">Original concept</p><p className="font-editorial text-xl leading-snug text-[#abb0a7] md:text-2xl">“{brief.concept || 'No concept supplied.'}”</p></div>
              <div className="grid gap-3 lg:grid-cols-3">{rewrite.hookOptions.map(option => <article data-testid={`card-hook-option-${option.label}`} key={option.label} className={`min-w-0 border-t p-5 md:p-6 ${option.recommendedForTesting ? 'border-[#d9b85e] bg-[#796334]/[.12]' : 'border-[#e0dac5]/20 bg-[#111817]'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="eyebrow text-[#d9b85e]">OPTION {option.label} · {option.angle}</p>{option.recommendedForTesting && <span className="rounded border border-[#d9b85e]/40 px-2 py-1 font-mono-ui text-[9px] text-[#e3ca8d]">RECOMMENDED FOR TESTING</span>}</div>
                <p data-testid={option.recommendedForTesting ? 'text-improved-hook' : `text-hook-option-${option.label}`} className="mt-5 font-editorial text-2xl leading-tight text-[#eee4bd] md:text-3xl">“{option.hook}”</p>
                <p className="mt-5 border-t border-[#e0dac5]/10 pt-3 text-xs leading-5 text-[#b5b3ab]"><strong className="text-[#d9c895]">Why this draft?</strong> {option.rationale} {option.whyDraft}</p>
                {option.supportingEvidenceIds?.length ? <p className="mt-2 font-mono-ui text-[9px] text-[#858d89]">SCORING EVIDENCE · {option.supportingEvidenceIds.length} REFERENCED RECORD{option.supportingEvidenceIds.length === 1 ? '' : 'S'}</p> : <p className="mt-2 font-mono-ui text-[9px] text-[#858d89]">BRIEF-GUIDED ANGLE · NO DIRECT RECORD CLAIM</p>}
              </article>)}</div>
           </div>}
           {view === 'script' && <div className="mx-auto max-w-4xl"><p className="eyebrow mb-6">15–30 second script · {insights.count ? 'evidence-guided' : 'brief-guided'} heuristic</p><div>{rewrite.script.map(({ label, text }, index) => <div key={label} className="grid gap-3 border-t border-[#e0dac5]/15 py-5 sm:grid-cols-[40px_140px_1fr] sm:gap-5"><span className="font-mono-ui text-[10px] text-[#767e76]">{String(index + 1).padStart(2, '0')}</span><span className="font-mono-ui text-[10px] tracking-[.14em] text-[#d9b85e]">{label}</span><p className={`leading-7 ${index === 0 ? 'font-editorial text-3xl text-[#f0e3c2]' : 'text-sm text-[#c5c2b7]'}`}>{text}</p></div>)}</div></div>}
           {view === 'storyboard' && <div><p className="eyebrow mb-4">Four-shot production board · deterministic draft</p><div className="grid gap-3 md:grid-cols-2">{rewrite.shots.map(({ time, visual, camera, spoken, purpose }, index) => <div data-testid={`storyboard-shot-${time.replace(/[:–]/g, '-')}`} key={time} className="border-t border-[#d9b85e]/30 bg-[#111817] p-5"><div className="mb-5 flex items-center justify-between"><span className="font-mono-ui text-sm text-[#d9b85e]">{time}</span><span className="font-editorial text-4xl text-[#d9b85e]/30">{String(index + 1).padStart(2, '0')}</span></div><div className="space-y-3 text-xs leading-5"><p><span className="text-[#747782]">VISUAL </span><span className="text-[#c4c1b7]">{visual}</span></p><p><span className="text-[#747782]">CAMERA </span><span className="text-[#c4c1b7]">{camera}</span></p><p><span className="text-[#747782]">SPOKEN </span><span className="text-[#eee6ce]">“{spoken}”</span></p><p><span className="text-[#747782]">PURPOSE </span><span className="text-[#a3a3aa]">{purpose}</span></p></div></div>)}</div></div>}
           <div className="mt-5 flex gap-2 rounded-xl border border-[#d9b85e]/15 bg-[#d9b85e]/[.04] p-4 text-xs leading-6 text-[#aaa99f]"><Lightbulb size={16} className="mt-1 shrink-0 text-[#d9b85e]" /><p><strong className="text-[#dfcf9d]">Why this draft?</strong> {rationale} This is a PreFlight deterministic draft, not copy generated by Oriane.</p></div>
        </div>
      </div>
    </section>
  );
}