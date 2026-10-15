import { useState } from 'react';
import { recordText, type Analysis, type VideoEvidence } from '@/lib/preflight';

const clamp = (n: number) => Math.max(8, Math.min(92, n));
const measured = (value?: number) => value !== undefined && Number.isFinite(value) && value >= 0;

export function OpportunityMap({ analysis }: { analysis: Analysis }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const evidence = analysis.evidence.filter(record => record.usedForScoring !== false);
  const live = analysis.source === 'live-oriane';
  const observed = live ? analysis.evidence.filter(record =>
    record.source === 'live-oriane' &&
    (record.relevanceLevel === 'high' || record.relevanceLevel === 'medium') &&
    (measured(record.engagementRate) || measured(record.views)),
  ) : [];
  const performance = analysis.signals.find(s => s.name === 'Performance Signal')?.score ?? 50;
  const saturation = analysis.signals.find(s => s.name === 'Saturation Risk')?.score ?? 50;
  const opening = (record: VideoEvidence) => record.match;
  const comparable = (live ? observed : evidence).filter(record =>
    opening(record).comparableOpening === true &&
    !!opening(record).openingPattern?.trim() &&
    measured(record.engagementRate),
  );
  const hookCounts = new Map<string, number>();
  comparable.forEach(record => {
    const pattern = opening(record).openingPattern!.trim().toLowerCase();
    hookCounts.set(pattern, (hookCounts.get(pattern) ?? 0) + 1);
  });
  const repeated = comparable.length >= 3 ? comparable.filter(record =>
    (hookCounts.get(opening(record).openingPattern!.trim().toLowerCase()) ?? 0) >= 2,
  ) : [];
  const engagementValues = observed.map(record => record.engagementRate).filter(measured) as number[];
  const viewValues = observed.map(record => record.views).filter(measured) as number[];
  const mixedMetrics = engagementValues.length > 0 && observed.some(record => !measured(record.engagementRate) && measured(record.views));
  const points = live ? observed : repeated.slice(0, 8);
  const markers = points.map((record, index) => {
    const pattern = opening(record).openingPattern?.trim().toLowerCase();
    const support = pattern ? hookCounts.get(pattern) ?? 0 : 0;
    const repeatedOpening = comparable.length >= 3 && support >= 2;
    const metric = measured(record.engagementRate) ? 'Engagement' : 'Views';
    const value = metric === 'Engagement' ? record.engagementRate! : record.views!;
    const values = live ? (metric === 'Engagement' ? engagementValues : viewValues) : comparable.map(item => item.engagementRate!);
    const low = Math.min(...values);
    const high = Math.max(...values);
    return {
      id: record.id,
      record,
      name: record.creator || record.profileHandle || `Video ${index + 1}`,
      metric,
      value,
      support,
      repeatedOpening,
      x: clamp(live
        ? (repeatedOpening ? 50 + (support / comparable.length) * 42 : 50 + (index % 5 - 2) * 2.5)
        : (support / evidence.length) * 100),
      y: clamp(low === high ? 50 : 18 + ((value - low) / (high - low)) * 68),
    };
  });
  const selectedMarker = markers.find(marker => marker.id === (hovered || selected));
  const ideaZone = evidence.length < 3 ? null : performance >= 50 ? saturation <= 50 ? 'Opportunity' : 'Works but crowded' : saturation <= 50 ? 'Experimental' : 'Avoid';
  return (
    <section id="opportunity" className="scroll-mt-24">
      <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div><p className="eyebrow text-[#d2ac65]">03 / Strategy instrument</p><h2 className="mt-3 font-editorial text-5xl text-[#eee8d9] md:text-7xl">Creative Opportunity Map</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#a5a8a4]">{live ? 'Each evidence point is a real video from this run. Its vertical position is sample-relative observed engagement (or views if engagement is unavailable); YOUR IDEA uses separate heuristic signals. Neither forecasts market performance.' : evidence.length ? 'Where the idea sits before the camera rolls. Placement is a heuristic reading of scored signals, not observed ad performance.' : 'No scored comparable evidence: a strategic position cannot be assigned from this run.'}</p></div>
        <span className="font-mono-ui text-[10px] tracking-widest text-[#79c1b3]">{analysis.source === 'live-oriane' ? 'LIVE ORIANE EVIDENCE' : 'DEMO / ILLUSTRATIVE'}</span>
      </div>
      {analysis.trace?.partial && <p className="mb-5 rounded-lg border border-[#d9b85e]/40 bg-[#d9b85e]/10 p-3 text-xs font-semibold text-[#ead09b]">PARTIAL SEARCH · COVERAGE INCOMPLETE. The plotted sample may not represent all intended search intents.</p>}
      {live && observed.length > 0 && comparable.length < 3 && <p className="mb-5 text-xs text-[#c8bc9e]">Observed evidence points are sample-relative; insufficient comparable hooks for a market-wide pattern.</p>}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(240px,.6fr)]">
        <div className="min-w-0 border border-[#bca06a]/20 bg-[#151b1b] p-4 sm:p-7">
          <div className="mb-4 flex justify-between font-mono-ui text-[10px] uppercase tracking-wider text-[#a8a696]"><span>↑ {live ? 'Observed metric' : 'Performance signal'}</span><span>Sample-relative where observed</span></div>
          <div className="relative h-[390px] w-full overflow-hidden border-l border-b border-[#cbb77e]/40 bg-[linear-gradient(to_right,transparent_49.9%,#cbb77e24_50%,transparent_50.1%),linear-gradient(to_bottom,transparent_49.9%,#cbb77e24_50%,transparent_50.1%)] sm:h-[480px]">
            {live ? <span className="absolute left-3 top-3 font-mono-ui text-[10px] tracking-wider text-[#c7d6c4]">OBSERVED EVIDENCE · SAMPLE ONLY</span> : <>
              <span className="absolute left-3 top-3 font-editorial text-lg text-[#c7d6c4]">Opportunity</span>
              <span className="absolute right-3 top-3 text-right font-editorial text-lg text-[#c7b69a]">Competitive / saturated</span>
              <span className="absolute bottom-3 left-3 font-editorial text-lg text-[#8f9894]">Unproven</span>
              <span className="absolute bottom-3 right-3 font-editorial text-lg text-[#9e8a78]">Avoid</span>
            </>}
              {markers.map(marker => <button key={marker.id} data-testid={`point-opportunity-${marker.id}`} type="button" aria-label={`${marker.name}: ${live ? 'observed evidence' : 'illustrative evidence'}, ${marker.metric.toLowerCase()} ${marker.value}${marker.metric === 'Engagement' ? '%' : ' views'}, relevance ${marker.record.relevanceScore ?? 'not assessed'}, ${marker.record.usedForScoring !== false ? 'used in score' : 'not scored'}`} onMouseEnter={() => setHovered(marker.id)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(marker.id)} onBlur={() => setHovered(null)} onClick={() => { setSelected(marker.id); window.dispatchEvent(new CustomEvent('preflight:focus-evidence', { detail: marker.id })); }} className={`opportunity-point absolute z-10 -translate-x-1/2 translate-y-1/2 rounded-full border transition-transform hover:scale-150 focus-visible:scale-150 focus-visible:outline focus-visible:outline-[#eed197] ${marker.record.usedForScoring === false ? 'h-3 w-3 border-[#8ca9a0] bg-[#52988e]/45' : marker.record.relevanceLevel === 'high' ? 'h-5 w-5 border-[#c0e0d4] bg-[#65afa2]' : 'h-4 w-4 border-[#93c5b9] bg-[#52988e]/75'}`} style={{ left: `${marker.x}%`, bottom: `${marker.y}%` }} />)}
              {(evidence.length > 0 || markers.length > 0) ? <button data-testid="point-your-idea" type="button" title={`Heuristic placement: performance ${performance}/100, saturation risk ${saturation}/100. Not observed concept performance.`} onMouseEnter={() => setHovered('idea')} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered('idea')} onBlur={() => setHovered(null)} onClick={() => setSelected(selected === 'idea' ? null : 'idea')} className="opportunity-point absolute z-20 flex -translate-x-1/2 translate-y-1/2 flex-col items-center gap-1.5 focus-visible:outline focus-visible:outline-[#e9cb87]" style={{ left: `${clamp(saturation)}%`, bottom: `${clamp(performance)}%` }}>
              <span className="grid h-9 w-9 rotate-45 place-items-center border border-[#f0d18c] bg-[#a77a3d] shadow-[0_0_0_8px_#d6b46d20]"><span className="-rotate-45 font-mono-ui text-xs font-bold text-[#171b19]">+</span></span>
              <span className="whitespace-nowrap bg-[#d8ba76] px-2 py-1 font-mono-ui text-[9px] font-bold tracking-widest text-[#181c1b]">YOUR IDEA</span>
             </button> : <p className="absolute inset-x-5 top-1/2 -translate-y-1/2 rounded-lg border border-[#d9b85e]/30 bg-[#202522]/95 p-5 text-center text-sm leading-6 text-[#e3d7b9]">No scored comparable evidence. No strategic zone or novelty conclusion can be assigned from this run.</p>}
             {hovered && <div role="tooltip" className="pointer-events-none absolute bottom-3 left-3 z-30 max-h-[70%] max-w-[min(340px,85%)] overflow-auto rounded-lg border border-[#d9b85e]/35 bg-[#202522] p-3 text-xs leading-5 text-[#e8e1cb] shadow-xl">{hovered === 'idea' ? <><strong>YOUR IDEA · HEURISTIC</strong><br />Saturation risk {saturation}/100 · performance signal {performance}/100 · {evidence.length} scored records. Not observed concept performance.</> : selectedMarker ? <><strong>{selectedMarker.name} · {live ? 'OBSERVED EVIDENCE' : 'ILLUSTRATIVE EVIDENCE'}</strong><br />{selectedMarker.record.platform || 'Platform not supplied'} · relevance {selectedMarker.record.relevanceScore === undefined ? 'not assessed' : `${selectedMarker.record.relevanceScore}% heuristic match`}<br />Views {selectedMarker.record.views?.toLocaleString() ?? 'not supplied'} · engagement {selectedMarker.record.engagementRate === undefined ? 'not supplied' : `${selectedMarker.record.engagementRate}%`}<br />{selectedMarker.record.usedForScoring !== false ? 'USED IN SCORE' : 'SUPPORTING / NOT SCORED'} · {selectedMarker.repeatedOpening ? `${selectedMarker.support} matching comparable openings in this sample` : 'Comparable repetition not established'}<br /><span className="mt-1 block break-words text-[#bcbeb7]">“{recordText(selectedMarker.record).slice(0, 115)}”</span></> : null}</div>}
          </div>
          <div className="mt-3 flex justify-between font-mono-ui text-[10px] uppercase tracking-wider text-[#a8a696]"><span>{live ? 'Less repeated in sample' : 'Low saturation'}</span><span>{live ? 'Sample repetition →' : 'Saturation risk →'}</span><span>{live ? 'More repeated in sample' : 'High saturation'}</span></div>
          <div aria-live="polite" className="mt-5 min-h-12 border-t border-[#ded0a3]/15 pt-4 text-xs leading-5 text-[#bdbbad]">
              {(hovered || selected) === 'idea' ? `Your idea: heuristic performance signal ${performance}/100; saturation risk ${saturation}/100. ${evidence.length < 3 ? 'Insufficient comparable evidence for an opportunity conclusion. ' : ''}This is not an observed campaign result or the final recommendation.`
                : selectedMarker ? `${selectedMarker.name}: ${live ? 'observed video' : 'illustrative video'} · ${selectedMarker.metric.toLowerCase()} ${selectedMarker.value}${selectedMarker.metric === 'Engagement' ? '%' : ' views'} (position relative to videos with this metric) · ${selectedMarker.repeatedOpening ? `${selectedMarker.support} comparable openings in this sample` : 'no established repeated opening'} · select to see the evidence card.`
                 : markers.length ? `${markers.length} ${live ? 'real, high/medium-relevance Oriane videos' : 'illustrative videos'} plotted. Points near the center with no comparable opening are spaced for visibility only. X is sample-relative where comparable; YOUR IDEA has separate heuristic placement. ${mixedMetrics ? 'Engagement and views use separate sample-relative scales.' : ''}` : evidence.length ? 'No relevant video has a supplied engagement rate or views to plot. The concept placement is heuristic; topic matches do not establish creative novelty.' : 'No scored comparable evidence. No strategic placement or novelty conclusion is available.'}
          </div>
        </div>
        <aside className="flex flex-col justify-between border-t border-[#c1a465]/60 bg-[#202521] p-6 sm:p-8">
          <div><p className="eyebrow text-[#d2ac65]">Performance × saturation</p><h3 className="mt-5 font-editorial text-4xl text-[#e8e3d2]">The strategic matrix.</h3><div className="mt-8 grid grid-cols-2 gap-px bg-[#d9b85e]/20 text-xs">
            {['Opportunity', 'Works but crowded', 'Experimental', 'Avoid'].map((zone, index) => <div key={zone} className={`min-h-24 p-3 ${ideaZone === zone ? 'bg-[#ad8b4f]/25 text-[#e9d3a0]' : 'bg-[#202521] text-[#9ba09b]'}`}><span className="mb-3 block font-mono-ui text-[9px] text-[#777f7a]">0{index + 1}</span>{zone}{ideaZone === zone && <span className="mt-2 block font-mono-ui text-[9px] uppercase tracking-widest">Your concept · heuristic</span>}</div>)}
          </div></div>
            <p className="mt-8 border-t border-[#d9b85e]/20 pt-5 text-xs leading-6 text-[#929a94]">Quadrants orient the next creative discussion, not the final GO / REVISE / AVOID decision, which uses all five signals. {ideaZone ? 'Neutral saturation risk (50) sits on the boundary.' : 'Limited comparable evidence: no strategic zone is assigned.'} Placement does not forecast campaign performance or market-wide saturation.</p>
        </aside>
      </div>
    </section>
  );
}

export function SignalTimeline({ analysis }: { analysis: Analysis }) {
  const evidence = analysis.evidence.filter(record => record.usedForScoring !== false);
  const dated = evidence.flatMap(record => {
    const time = Date.parse(record.publishDate || '');
    return Number.isFinite(time) ? [{ record, time }] : [];
  }).sort((a, b) => a.time - b.time);
  const months = new Map<string, number>();
  dated.forEach(({ time }) => { const label = new Date(time).toLocaleDateString('en', { month: 'short', year: 'numeric', timeZone: 'UTC' }); months.set(label, (months.get(label) || 0) + 1); });
  const maximum = Math.max(1, ...months.values());
  return <section className="border-y border-[#e0dac5]/15 py-8 md:py-12">
    <div className="grid gap-8 md:grid-cols-[.7fr_1.3fr]">
       <div><p className="eyebrow">Time / observed sample</p><h3 className="mt-3 font-editorial text-4xl text-[#eee8d9]">Signal Timeline</h3><p className="mt-4 text-sm leading-6 text-[#a5a8a4]">Scored evidence by publication month. A small retrieved sample is not a representative time series; no emerging or declining trend can be established here.</p><p className="mt-4 font-mono-ui text-[10px] text-[#8cbfb4]">{dated.length}/{evidence.length} SCORED RECORDS HAVE VALID DATES</p></div>
      <div className="flex min-h-48 items-end gap-2 border-b border-[#d2b56b]/30 pb-0">
         {months.size ? [...months].map(([label, count]) => <div key={label} tabIndex={0} className="chart-hover-row group relative flex min-w-0 flex-1 flex-col items-center justify-end gap-2 text-center" title={`${count} scored record${count === 1 ? '' : 's'} published ${label}`} aria-label={`${label}: ${count} scored records`}><span className="pointer-events-none absolute bottom-full left-0 z-10 hidden min-w-max rounded border border-[#d9b85e]/30 bg-[#202522] px-2 py-1 font-mono-ui text-[10px] text-[#e1d7b7] group-hover:block group-focus:block">{label} · {count} scored records</span><span className="font-mono-ui text-[10px] text-[#d4ba79]">{count}</span><div className="w-full max-w-16 bg-[#927c4f]/80 group-hover:bg-[#c9ab68] group-focus-visible:bg-[#c9ab68]" style={{ height: `${Math.max(12, count / maximum * 125)}px` }} /><span className="min-h-9 font-mono-ui text-[9px] leading-4 text-[#979b95]">{label}</span></div>) : <p className="m-auto text-sm text-[#939a95]">Insufficient dated evidence for a timeline.</p>}
      </div>
    </div>
  </section>;
}