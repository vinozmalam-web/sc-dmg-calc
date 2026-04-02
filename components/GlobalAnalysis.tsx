import React, { useMemo, useState } from 'react';
import { Stats, SavedConfig, StatKey } from '../types';
import { UI_TEXT } from '../constants';
import { DamageCalculator } from '../services/calculator';
import { TrendingUp, TrendingDown, Minus, ShieldAlert } from 'lucide-react';

interface GlobalAnalysisProps {
  savedConfigs: SavedConfig[];
  candidate: Stats;
  candidateRank: number;
  isBetaEnabled: boolean;
  forceCrit: boolean;
  texts: typeof UI_TEXT['en'];
  labels: Record<StatKey, string>;
  onLoadConfig?: (config: SavedConfig) => void;
}

export const GlobalAnalysis: React.FC<GlobalAnalysisProps> = ({
  savedConfigs,
  candidate,
  candidateRank,
  isBetaEnabled,
  forceCrit,
  texts,
  labels,
  onLoadConfig
}) => {
  const [prioritizeMode, setPrioritizeMode] = useState<'general' | 'spec_ops'>('general');

  const analysisResults = useMemo(() => {
    const isCandidateEmpty = Object.values(candidate).every(v => v === 0);
    if (isCandidateEmpty || savedConfigs.length === 0) return [];

    return savedConfigs.map(config => {
      const shipRank = config.level || 15;
      
      if (candidateRank > shipRank) {
        return { config, status: 'rank_too_high' as const };
      }

      const recs = DamageCalculator.findBestReplacement(
        config.baseStats,
        config.chips,
        candidate,
        config.activeModules || {},
        config.selectedDamageType || 'em',
        isBetaEnabled,
        forceCrit
      );

      const bestRec = [...recs].sort((a, b) => {
        const scoreA = prioritizeMode === 'general' ? a.general.dpm_delta : a.spec_ops.dpm_delta;
        const scoreB = prioritizeMode === 'general' ? b.general.dpm_delta : b.spec_ops.dpm_delta;
        return scoreB - scoreA;
      })[0];

      if (bestRec) {
        const primaryDelta = prioritizeMode === 'general' ? bestRec.general.dpm_delta : bestRec.spec_ops.dpm_delta;
        const isImprovement = primaryDelta > 0 || bestRec.range_delta > 0;
        return { config, status: isImprovement ? 'improves' as const : 'degrades' as const, rec: bestRec };
      }

      return { config, status: 'degrades' as const };
    }).sort((a, b) => {
      const statusOrder = { improves: 0, degrades: 1, rank_too_high: 2 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      if (a.rec && b.rec) {
        const scoreA = prioritizeMode === 'general' ? a.rec.general.dpm_delta : a.rec.spec_ops.dpm_delta;
        const scoreB = prioritizeMode === 'general' ? b.rec.general.dpm_delta : b.rec.spec_ops.dpm_delta;
        return scoreB - scoreA;
      }
      return 0;
    });
  }, [savedConfigs, candidate, candidateRank, isBetaEnabled, forceCrit, prioritizeMode]);

  const formatDelta = (val: number) => {
    const rounded = Math.round(val);
    if (rounded > 0) return `+${rounded}`;
    if (rounded < 0) return `${rounded}`;
    return '0';
  };

  const getDeltaColor = (val: number) => {
    const rounded = Math.round(val);
    if (rounded > 0) return 'text-emerald-400';
    if (rounded < 0) return 'text-red-400';
    return 'text-slate-400';
  };

  const getDeltaIcon = (val: number) => {
    const rounded = Math.round(val);
    if (rounded > 0) return <TrendingUp className="w-3 h-3" />;
    if (rounded < 0) return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-3 h-full">
      {/* Right: Results */}
      <div className="flex-1 bg-slate-800/40 rounded-xl p-2.5 sm:p-3 border border-slate-700/50 overflow-y-auto custom-scrollbar">
        {/* Header with title + mode toggle */}
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h2 className="text-base font-bold">{texts.globalAnalysis}</h2>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">{texts.optimizeFor}</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPrioritizeMode('spec_ops')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
                  prioritizeMode === 'spec_ops'
                    ? 'bg-purple-600/20 border-purple-500 text-purple-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >
                {texts.specOps}
              </button>
              <button
                onClick={() => setPrioritizeMode('general')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
                  prioritizeMode === 'general'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >
                {texts.general}
              </button>
            </div>
          </div>
        </div>
        
        {savedConfigs.length === 0 ? (
          <div className="text-slate-500 text-center py-10 italic">
            {texts.noSavedConfigs}
          </div>
        ) : Object.values(candidate).every(v => v === 0) ? (
          <div className="text-slate-500 text-center py-10 italic">
            {texts.enterCandidate}
          </div>
        ) : (
          <div className="space-y-3">
            {analysisResults.map((res, idx) => (
              <div 
                key={idx} 
                onDoubleClick={() => onLoadConfig?.(res.config)}
                title={texts.loadConfigTooltip || "Double-click to load"}
                className={`p-3 rounded-lg border cursor-pointer hover:brightness-110 transition-all ${
                  res.status === 'improves' 
                    ? 'bg-emerald-900/20 border-emerald-700/50' 
                    : res.status === 'degrades'
                      ? 'bg-orange-900/10 border-orange-900/30'
                      : 'bg-red-900/10 border-red-900/30 opacity-60 hover:opacity-80'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="font-bold text-slate-200 text-sm">{res.config.name}</div>
                  <div className="text-[11px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded">
                    {texts.shipRank}: {res.config.level || 15}
                  </div>
                </div>

                {res.status === 'rank_too_high' && (
                  <div className="flex items-center gap-2 text-red-400 text-xs mt-2">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{texts.rankTooHigh}</span>
                  </div>
                )}

                {(res.status === 'improves' || res.status === 'degrades') && res.rec && (
                  <div className="mt-2 space-y-1.5">
                    <div className="text-xs text-slate-300">
                      {texts.replacesSlot} <span className="font-bold text-white">{res.rec.replaced_index + 1}</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <div className={`bg-slate-900/50 p-1.5 rounded border transition-colors ${prioritizeMode === 'spec_ops' ? 'border-purple-500/50 bg-purple-900/10' : 'border-slate-700/50'}`}>
                        <div className={`text-[10px] mb-0.5 font-medium ${prioritizeMode === 'spec_ops' ? 'text-purple-400' : 'text-slate-400'}`}>{texts.specOps}</div>
                        <div className={`flex items-center gap-1 font-mono text-xs ${getDeltaColor(res.rec.spec_ops.dpm_delta)}`}>
                          {getDeltaIcon(res.rec.spec_ops.dpm_delta)}
                          {formatDelta(res.rec.spec_ops.dpm_delta)}
                        </div>
                      </div>
                      <div className={`bg-slate-900/50 p-1.5 rounded border transition-colors ${prioritizeMode === 'general' ? 'border-blue-500/50 bg-blue-900/10' : 'border-slate-700/50'}`}>
                        <div className={`text-[10px] mb-0.5 font-medium ${prioritizeMode === 'general' ? 'text-blue-400' : 'text-slate-400'}`}>{texts.general}</div>
                        <div className={`flex items-center gap-1 font-mono text-xs ${getDeltaColor(res.rec.general.dpm_delta)}`}>
                          {getDeltaIcon(res.rec.general.dpm_delta)}
                          {formatDelta(res.rec.general.dpm_delta)}
                        </div>
                      </div>
                      <div className="bg-slate-900/50 p-1.5 rounded border border-slate-700/50">
                        <div className="text-[10px] text-slate-400 mb-0.5">{labels['range']}</div>
                        <div className={`flex items-center gap-1 font-mono text-xs ${getDeltaColor(res.rec.range_delta)}`}>
                          {getDeltaIcon(res.rec.range_delta)}
                          {formatDelta(res.rec.range_delta)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
