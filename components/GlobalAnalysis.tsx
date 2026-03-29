import React, { useMemo } from 'react';
import { Stats, SavedConfig, StatKey } from '../types';
import { UI_TEXT } from '../constants';
import { DamageCalculator } from '../services/calculator';
import { TrendingUp, TrendingDown, Minus, ShieldAlert } from 'lucide-react';

interface GlobalAnalysisProps {
  savedConfigs: SavedConfig[];
  candidate: Stats;
  candidateRank: number;
  isBetaEnabled: boolean;
  texts: typeof UI_TEXT['en'];
  labels: Record<StatKey, string>;
}

export const GlobalAnalysis: React.FC<GlobalAnalysisProps> = ({
  savedConfigs,
  candidate,
  candidateRank,
  isBetaEnabled,
  texts,
  labels
}) => {
  
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
        isBetaEnabled
      );

      const bestRec = [...recs].sort((a, b) => {
        const maxA = Math.max(a.spec_ops.dpm_delta, a.general.dpm_delta);
        const maxB = Math.max(b.spec_ops.dpm_delta, b.general.dpm_delta);
        return maxB - maxA;
      })[0];

      if (bestRec) {
        const isImprovement = bestRec.spec_ops.dpm_delta > 0 || bestRec.general.dpm_delta > 0 || bestRec.range_delta > 0;
        return { config, status: isImprovement ? 'improves' as const : 'degrades' as const, rec: bestRec };
      }

      return { config, status: 'degrades' as const };
    }).sort((a, b) => {
      const statusOrder = { improves: 0, degrades: 1, rank_too_high: 2 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      if (a.rec && b.rec) {
        const maxA = Math.max(a.rec.spec_ops.dpm_delta, a.rec.general.dpm_delta);
        const maxB = Math.max(b.rec.spec_ops.dpm_delta, b.rec.general.dpm_delta);
        return maxB - maxA;
      }
      return 0;
    });
  }, [savedConfigs, candidate, candidateRank, isBetaEnabled]);

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
        <h2 className="text-base font-bold mb-3">{texts.globalAnalysis}</h2>
        
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
                className={`p-3 rounded-lg border ${
                  res.status === 'improves' 
                    ? 'bg-emerald-900/20 border-emerald-700/50' 
                    : res.status === 'degrades'
                      ? 'bg-orange-900/10 border-orange-900/30'
                      : 'bg-red-900/10 border-red-900/30 opacity-60'
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
                      <div className="bg-slate-900/50 p-1.5 rounded border border-slate-700/50">
                        <div className="text-[10px] text-slate-400 mb-0.5">{texts.specOps}</div>
                        <div className={`flex items-center gap-1 font-mono text-xs ${getDeltaColor(res.rec.spec_ops.dpm_delta)}`}>
                          {getDeltaIcon(res.rec.spec_ops.dpm_delta)}
                          {formatDelta(res.rec.spec_ops.dpm_delta)}
                        </div>
                      </div>
                      <div className="bg-slate-900/50 p-1.5 rounded border border-slate-700/50">
                        <div className="text-[10px] text-slate-400 mb-0.5">{texts.general}</div>
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
