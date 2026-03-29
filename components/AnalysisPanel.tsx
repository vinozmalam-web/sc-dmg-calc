import React, { useMemo } from 'react';
import { Stats, StatKey, ModuleState, DamageType } from '../types';
import { StatInput } from './StatInput';
import { CHIP_STATS_KEYS, UI_TEXT } from '../constants';
import { DamageCalculator } from '../services/calculator';
import { ArrowRight, TrendingUp, TrendingDown, RefreshCcw, X, Minus } from 'lucide-react';

interface AnalysisPanelProps {
  baseStats: Stats;
  chips: Stats[];
  candidate: Stats;
  candidateRank: number;
  activeModules: Record<string, ModuleState>;
  selectedDamageType: DamageType;
  isBetaEnabled: boolean;
  labels: Record<StatKey, string>;
  texts: typeof UI_TEXT['en'];
  tooltips: Record<StatKey, string>;
  warnings?: Record<string, string>;
  onCandidateChange: (key: string, value: number) => void;
  onCandidateRankChange: (rank: number) => void;
  onApplyReplacement: (index: number) => void;
  onResetCandidate: () => void;
  onSaveToInventory: () => void;
  onClose?: () => void;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  baseStats,
  chips,
  candidate,
  candidateRank,
  activeModules,
  selectedDamageType,
  isBetaEnabled,
  labels,
  texts,
  tooltips,
  warnings = {},
  onCandidateChange,
  onCandidateRankChange,
  onApplyReplacement,
  onResetCandidate,
  onSaveToInventory,
  onClose
}) => {
  
  const recommendations = useMemo(() => {
    return DamageCalculator.findBestReplacement(baseStats, chips, candidate, activeModules, selectedDamageType, isBetaEnabled);
  }, [baseStats, chips, candidate, activeModules, selectedDamageType, isBetaEnabled]);

  const sortedRecs = useMemo(() => {
    return [...recommendations].sort((a, b) => b.spec_ops.dpm_delta - a.spec_ops.dpm_delta);
  }, [recommendations]);

  const formatDelta = (val: number) => {
    const rounded = Math.round(val * 10) / 10;
    if (rounded > 0) return `+${rounded.toLocaleString(undefined, { maximumFractionDigits: 1 })}`;
    if (rounded < 0) return `${rounded.toLocaleString(undefined, { maximumFractionDigits: 1 })}`;
    return '0';
  };

  const getDeltaColor = (val: number) => {
    const rounded = Math.round(val * 10) / 10;
    if (rounded > 0) return 'text-emerald-400';
    if (rounded < 0) return 'text-red-400';
    return 'text-slate-400';
  };

  const getDeltaIcon = (val: number) => {
    const rounded = Math.round(val * 10) / 10;
    if (rounded > 0) return <TrendingUp className="w-3 h-3"/>;
    if (rounded < 0) return <TrendingDown className="w-3 h-3"/>;
    return <Minus className="w-3 h-3"/>;
  };

  return (
    <div className="bg-slate-800 border-l border-slate-700 h-full flex flex-col w-full md:w-[400px]">
      <div className="p-3 border-b border-slate-700 bg-slate-800 z-10 sticky top-0 flex justify-between items-center">
        <div className="flex items-center gap-2">
          {onClose && (
            <button 
              onClick={onClose}
              className="lg:hidden p-1 -ml-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-700 transition-colors"
              aria-label="Close Analysis"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <h2 className="text-base font-bold text-indigo-400 flex items-center gap-2">
            <RefreshCcw className="w-4 h-4" /> {texts.analysis}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onSaveToInventory}
            className="text-[11px] text-emerald-400 hover:text-emerald-300 bg-emerald-900/40 hover:bg-emerald-800/60 px-2 py-1 rounded transition-colors border border-emerald-800/50"
            title={texts.saveToInventory}
          >
            {texts.saveToInventory}
          </button>
          <button 
            onClick={onResetCandidate}
            className="text-[11px] text-slate-400 hover:text-white bg-slate-700 px-2 py-1 rounded transition-colors"
          >
            {texts.reset}
          </button>
        </div>
      </div>

      <div className="p-3 flex-1 overflow-y-auto custom-scrollbar">
        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 mb-4">
          <h3 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">{texts.candidateStats}</h3>
          
          <div className="mb-3">
            <label className="text-slate-400 font-medium text-[11px] truncate mb-0.5 block" title={texts.chipRank}>
                {texts.chipRank}
            </label>
            <input
                type="number"
                min="1"
                max="17"
                value={candidateRank}
                onChange={(e) => onCandidateRankChange(Math.max(1, Math.min(17, Number(e.target.value))))}
                className={`w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100 focus:border-blue-500 outline-none transition-colors text-xs`}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {CHIP_STATS_KEYS.filter(key => key !== 'level').map(key => (
              <StatInput
                key={key}
                statKey={key}
                value={candidate[key] || 0}
                label={labels[key]}
                description={tooltips[key]}
                warning={warnings[`candidate_${key}`]}
                onChange={onCandidateChange}
                compact
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">{texts.recommendations}</h3>
          
          {sortedRecs.length === 0 ? (
            <div className="text-slate-500 italic text-center py-6 text-xs">
              {texts.emptyRecs}
            </div>
          ) : (
            <div className="space-y-2">
              {sortedRecs.map((rec) => (
                <div key={rec.replaced_index} className="bg-slate-800 p-2.5 rounded-lg border border-slate-700 hover:border-indigo-500/50 transition-all group">
                  <div className="flex justify-between items-start mb-1.5">
                    <div className="text-xs font-bold text-slate-200">
                      {texts.replaceChip} {rec.replaced_index + 1}
                    </div>
                    <button
                      onClick={() => onApplyReplacement(rec.replaced_index)}
                      className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors"
                    >
                      {texts.apply} <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <div className="text-slate-400 mb-0.5">{texts.specOps} {texts.dpm}</div>
                      <div className={`font-mono font-bold flex items-center gap-1 ${getDeltaColor(rec.spec_ops.dpm_delta)}`}>
                        {getDeltaIcon(rec.spec_ops.dpm_delta)}
                        {formatDelta(rec.spec_ops.dpm_delta)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-0.5">{texts.general} {texts.dpm}</div>
                      <div className={`font-mono font-bold flex items-center gap-1 ${getDeltaColor(rec.general.dpm_delta)}`}>
                         {getDeltaIcon(rec.general.dpm_delta)}
                         {formatDelta(rec.general.dpm_delta)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-0.5">{labels.range}</div>
                      <div className={`font-mono font-bold flex items-center gap-1 ${getDeltaColor(rec.range_delta)}`}>
                         {getDeltaIcon(rec.range_delta)}
                         {formatDelta(rec.range_delta)}
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