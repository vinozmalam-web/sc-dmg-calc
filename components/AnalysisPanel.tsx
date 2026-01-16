import React, { useMemo } from 'react';
import { Stats, StatKey } from '../types';
import { StatInput } from './StatInput';
import { CHIP_STATS_KEYS, UI_TEXT } from '../constants';
import { DamageCalculator } from '../services/calculator';
import { ArrowRight, TrendingUp, TrendingDown, RefreshCcw, X } from 'lucide-react';

interface AnalysisPanelProps {
  baseStats: Stats;
  chips: Stats[];
  candidate: Stats;
  labels: Record<StatKey, string>;
  texts: typeof UI_TEXT['en'];
  onCandidateChange: (key: string, value: number) => void;
  onApplyReplacement: (index: number) => void;
  onResetCandidate: () => void;
  onClose?: () => void;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  baseStats,
  chips,
  candidate,
  labels,
  texts,
  onCandidateChange,
  onApplyReplacement,
  onResetCandidate,
  onClose
}) => {
  
  const recommendations = useMemo(() => {
    return DamageCalculator.findBestReplacement(baseStats, chips, candidate);
  }, [baseStats, chips, candidate]);

  const sortedRecs = useMemo(() => {
    // Sort by Spec Ops DPM Gain descending
    return [...recommendations].sort((a, b) => b.spec_ops.dpm_delta - a.spec_ops.dpm_delta);
  }, [recommendations]);

  return (
    <div className="bg-slate-800 border-l border-slate-700 h-full flex flex-col w-full md:w-[400px]">
      <div className="p-4 border-b border-slate-700 bg-slate-800 z-10 sticky top-0 flex justify-between items-center">
        <div className="flex items-center gap-2">
          {onClose && (
            <button 
              onClick={onClose}
              className="lg:hidden p-1 -ml-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-700 transition-colors"
              aria-label="Close Analysis"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-lg font-bold text-indigo-400 flex items-center gap-2">
            <RefreshCcw className="w-5 h-5" /> {texts.analysis}
          </h2>
        </div>
        <button 
          onClick={onResetCandidate}
          className="text-xs text-slate-400 hover:text-white bg-slate-700 px-2 py-1 rounded transition-colors"
        >
          {texts.reset}
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
        {/* Candidate Inputs */}
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 mb-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">{texts.candidateStats}</h3>
          <div className="grid grid-cols-2 gap-2">
            {CHIP_STATS_KEYS.map(key => (
              <StatInput
                key={key}
                statKey={key}
                value={candidate[key] || 0}
                label={labels[key]}
                onChange={onCandidateChange}
                compact
              />
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">{texts.recommendations}</h3>
          
          {sortedRecs.length === 0 ? (
            <div className="text-slate-500 italic text-center py-8 text-sm">
              {texts.emptyRecs}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedRecs.map((rec) => (
                <div key={rec.replaced_index} className="bg-slate-800 p-3 rounded-lg border border-slate-700 hover:border-indigo-500/50 transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm font-bold text-slate-200">
                      {texts.replaceChip} {rec.replaced_index + 1}
                    </div>
                    <button
                      onClick={() => onApplyReplacement(rec.replaced_index)}
                      className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors"
                    >
                      {texts.apply} <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="text-slate-400 mb-1">{texts.specOps} {texts.dpm}</div>
                      <div className={`font-mono font-bold flex items-center gap-1 ${rec.spec_ops.dpm_delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {rec.spec_ops.dpm_delta >= 0 ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
                        {rec.spec_ops.dpm_delta > 0 ? '+' : ''}{rec.spec_ops.dpm_delta.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">{texts.general} {texts.dpm}</div>
                      <div className={`font-mono font-bold flex items-center gap-1 ${rec.general.dpm_delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                         {rec.general.dpm_delta > 0 ? '+' : ''}{rec.general.dpm_delta.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
