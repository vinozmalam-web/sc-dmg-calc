import React, { useState, useMemo } from 'react';
import { Stats, SavedChip, SavedConfig, ModuleState, DamageType, StatKey } from '../types';
import { UI_TEXT, DEFAULT_CHIP_STATS } from '../constants';
import { DamageCalculator } from '../services/calculator';
import { X, Settings, Zap, ArrowRight } from 'lucide-react';

interface AutoBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedChips: SavedChip[];
  savedConfigs: SavedConfig[];
  baseStats: Stats;
  currentChips: Stats[];
  activeModules: Record<string, ModuleState>;
  selectedDamageType: DamageType;
  shipRank: number;
  isBetaEnabled: boolean;
  onApplyBuild: (chips: Stats[]) => void;
  texts: typeof UI_TEXT['en'];
  labels: Record<string, string>;
}

export const AutoBuilderModal: React.FC<AutoBuilderModalProps> = ({
  isOpen,
  onClose,
  savedChips,
  savedConfigs,
  baseStats,
  currentChips,
  activeModules,
  selectedDamageType,
  shipRank,
  isBetaEnabled,
  onApplyBuild,
  texts,
  labels
}) => {
  const [useOnlyAvailable, setUseOnlyAvailable] = useState(true);
  const [optimizeFor, setOptimizeFor] = useState<'general' | 'spec_ops'>('general');
  const [previewChips, setPreviewChips] = useState<Stats[] | null>(null);

  const availableChips = useMemo(() => {
    // Filter by rank
    let pool = savedChips.filter(c => c.level <= shipRank);

    if (useOnlyAvailable) {
      // Calculate used chips
      const usedChips: Stats[] = [];
      savedConfigs.forEach(config => {
        if (!config.isTemporary) {
          usedChips.push(...config.chips.filter(c => Object.values(c).some(v => v !== 0)));
        }
      });

      // Match and remove used chips from pool
      const poolCopy = [...pool];
      usedChips.forEach(usedChip => {
        const index = poolCopy.findIndex(c => {
          // Compare stats
          const keys = Object.keys(usedChip) as (keyof Stats)[];
          return keys.every(k => c.stats[k] === usedChip[k]);
        });
        if (index !== -1) {
          poolCopy.splice(index, 1);
        }
      });
      pool = poolCopy;
    }

    return pool.map(c => ({ ...c.stats, level: c.level }));
  }, [savedChips, savedConfigs, shipRank, useOnlyAvailable]);

  const handleCalculate = () => {
    // Simple greedy algorithm for now:
    // Start with empty chips
    // For each slot (0 to 4), find the best chip from the pool that maximizes the target DPM
    // Remove that chip from the pool and continue
    // This is a heuristic, not guaranteed optimal, but good enough for a start.
    
    let newChips: Stats[] = Array.from({ length: 5 }, () => ({ ...DEFAULT_CHIP_STATS }));
    let currentPool = [...availableChips];

    for (let i = 0; i < 5; i++) {
      let bestChipIndex = -1;
      let bestDpm = -1;

      for (let j = 0; j < currentPool.length; j++) {
        const testChips = [...newChips];
        testChips[i] = currentPool[j];
        
        const result = DamageCalculator.calculate(baseStats, testChips, activeModules, selectedDamageType, isBetaEnabled);
        const dpm = optimizeFor === 'general' ? result.general.dpm : result.spec_ops.dpm;

        if (dpm > bestDpm) {
          bestDpm = dpm;
          bestChipIndex = j;
        }
      }

      if (bestChipIndex !== -1) {
        newChips[i] = currentPool[bestChipIndex];
        currentPool.splice(bestChipIndex, 1);
      }
    }

    setPreviewChips(newChips);
  };

  const handleApply = () => {
    if (previewChips) {
      onApplyBuild(previewChips);
      handleClose();
    }
  };

  const handleClose = () => {
    setPreviewChips(null);
    onClose();
  };

  const currentResult = useMemo(() => {
    return DamageCalculator.calculate(baseStats, currentChips, activeModules, selectedDamageType, isBetaEnabled);
  }, [baseStats, currentChips, activeModules, selectedDamageType, isBetaEnabled]);

  const previewResult = useMemo(() => {
    if (!previewChips) return null;
    return DamageCalculator.calculate(baseStats, previewChips, activeModules, selectedDamageType, isBetaEnabled);
  }, [baseStats, previewChips, activeModules, selectedDamageType, isBetaEnabled]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            {texts.autoBuilder}
          </h3>
          <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {!previewChips ? (
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={useOnlyAvailable}
                    onChange={(e) => setUseOnlyAvailable(e.target.checked)}
                  />
                  <div className={`block w-8 h-5 rounded-full transition-colors ${useOnlyAvailable ? 'bg-blue-500' : 'bg-slate-700'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${useOnlyAvailable ? 'translate-x-3' : ''}`}></div>
                </div>
                <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">
                  {texts.useOnlyAvailable}
                </span>
              </label>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">{texts.optimizeFor}</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOptimizeFor('general')}
                    className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors border ${
                      optimizeFor === 'general' 
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {texts.general}
                  </button>
                  <button
                    onClick={() => setOptimizeFor('spec_ops')}
                    className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors border ${
                      optimizeFor === 'spec_ops' 
                      ? 'bg-purple-600/20 border-purple-500 text-purple-400' 
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {texts.specOps}
                  </button>
                </div>
              </div>
              
              <div className="bg-slate-800/50 p-2.5 rounded border border-slate-700 text-xs text-slate-400">
                {texts.foundChips} <strong className="text-slate-200">{availableChips.length}</strong> {texts.matchingCriteria} (&lt;= {shipRank}).
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                <h4 className="text-sm font-semibold text-slate-300 mb-2">{texts.previewChanges || "Preview Changes"}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">{texts.general} {texts.dpm}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-300">{currentResult.general.dpm.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                      <span className={`text-sm font-bold ${previewResult!.general.dpm > currentResult.general.dpm ? 'text-emerald-400' : previewResult!.general.dpm < currentResult.general.dpm ? 'text-red-400' : 'text-slate-300'}`}>
                        {previewResult!.general.dpm.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">{texts.specOps} {texts.dpm}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-300">{currentResult.spec_ops.dpm.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                      <span className={`text-sm font-bold ${previewResult!.spec_ops.dpm > currentResult.spec_ops.dpm ? 'text-emerald-400' : previewResult!.spec_ops.dpm < currentResult.spec_ops.dpm ? 'text-red-400' : 'text-slate-300'}`}>
                        {previewResult!.spec_ops.dpm.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Final Attributes Changes */}
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                <h4 className="text-sm font-semibold text-slate-300 mb-2">{texts.finalAttributes || "Final Attributes"}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(['fire_rate', 'range', 'crit_chance', 'crit_power', 'overheat', 'cooldown'] as StatKey[]).map(key => {
                    const currentVal = currentResult.final_stats[key] || 0;
                    const previewVal = previewResult!.final_stats[key] || 0;
                    
                    if (currentVal === previewVal && currentVal === 0) return null;

                    const isOverheat = key === 'overheat';
                    const isCooldown = key === 'cooldown';
                    const isBetter = isOverheat || isCooldown ? previewVal < currentVal : previewVal > currentVal;
                    const isWorse = isOverheat || isCooldown ? previewVal > currentVal : previewVal < currentVal;
                    
                    const colorClass = isBetter ? 'text-emerald-400' : isWorse ? 'text-red-400' : 'text-slate-300';
                    
                    const formatVal = (val: number) => isOverheat 
                      ? val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) 
                      : val.toLocaleString(undefined, { maximumFractionDigits: 2 });

                    return (
                      <div key={key} className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-medium mb-0.5">{labels[key]}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-300">{formatVal(currentVal)}</span>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <span className={`text-xs font-bold ${colorClass}`}>
                            {formatVal(previewVal)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              onClick={handleClose}
              className="px-3 py-1.5 rounded text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {texts.cancel}
            </button>
            {!previewChips ? (
              <button
                onClick={handleCalculate}
                disabled={availableChips.length === 0}
                className="px-3 py-1.5 rounded text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5" />
                {texts.build}
              </button>
            ) : (
              <button
                onClick={handleApply}
                className="px-3 py-1.5 rounded text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                {texts.apply}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
