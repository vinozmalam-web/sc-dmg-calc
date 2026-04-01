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
  forceCrit: boolean;
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
  forceCrit,
  onApplyBuild,
  texts,
  labels
}) => {
  const [useOnlyAvailable, setUseOnlyAvailable] = useState(true);
  const [optimizeFor, setOptimizeFor] = useState<'general' | 'spec_ops'>('general');
  const [keepRange, setKeepRange] = useState(false);
  const [minOverheat, setMinOverheat] = useState(0);
  const [previewChips, setPreviewChips] = useState<Stats[] | null>(null);
  const [constraintWarnings, setConstraintWarnings] = useState<string[]>([]);

  const availableChips = useMemo(() => {
    // Filter by rank
    let pool = savedChips.filter(c => c.level <= shipRank);

    if (useOnlyAvailable) {
      // Collect used chips across all non-temporary configs,
      // but skip chips that are already on the CURRENT ship —
      // those must remain available so auto-builder can keep / reuse them.
      const usedChips: Stats[] = [];
      savedConfigs.forEach(config => {
        if (!config.isTemporary) {
          config.chips
            .filter(c => Object.values(c).some(v => v !== 0))
            .forEach(usedChip => {
              // Check if this chip is one of the current ship's chips
              const isCurrentShipChip = currentChips.some(curChip => {
                const keys = new Set([...Object.keys(curChip), ...Object.keys(usedChip)]);
                for (const key of Array.from(keys)) {
                  if (key === 'level' || key === 'note') continue;
                  if ((curChip[key as keyof Stats] || 0) !== (usedChip[key as keyof Stats] || 0)) return false;
                }
                return true;
              });
              if (!isCurrentShipChip) {
                usedChips.push(usedChip);
              }
            });
        }
      });

      // Match and remove used chips from pool
      const poolCopy = [...pool];
      usedChips.forEach(usedChip => {
        const index = poolCopy.findIndex(c => {
          // Compare stats
          const keys = new Set([...Object.keys(c.stats), ...Object.keys(usedChip)]);
          for (const key of Array.from(keys)) {
            if (key === 'level' || key === 'note') continue;
            if ((c.stats[key] || 0) !== (usedChip[key as keyof Stats] || 0)) return false;
          }
          return true;
        });
        if (index !== -1) {
          poolCopy.splice(index, 1);
        }
      });
      pool = poolCopy;
    }

    return pool.map(c => ({ ...c.stats, level: c.level }));
  }, [savedChips, savedConfigs, currentChips, shipRank, useOnlyAvailable]);

  const handleCalculate = () => {
    let selectedChips: Stats[] = Array.from({ length: 5 }, () => ({ ...DEFAULT_CHIP_STATS }));
    let currentPool = [...availableChips];

    const hasConstraints = keepRange || minOverheat > 0;

    // Baseline for keepRange constraint
    const baseResult = DamageCalculator.calculate(baseStats, currentChips, activeModules, selectedDamageType, isBetaEnabled, forceCrit);
    const baseRangeVal = baseResult.final_stats.range || 0;

    // Returns true if the completed 5-chip build satisfies all active constraints
    const satisfiesConstraints = (chips: Stats[]): boolean => {
      if (!hasConstraints) return true;
      const r = DamageCalculator.calculate(baseStats, chips, activeModules, selectedDamageType, isBetaEnabled, forceCrit);
      if (keepRange && (r.final_stats.range || 0) < baseRangeVal - 0.001) return false;
      if (minOverheat > 0 && (r.final_stats.overheat || 0) < minOverheat - 0.001) return false;
      return true;
    };

    // Fill slots fromSlot..4 from pool greedily to MAXIMISE constraint-relevant stats.
    // This gives the best-case scenario for satisfying constraints.
    const buildOptimisticCompletion = (partial: Stats[], fromSlot: number, pool: Stats[]): Stats[] => {
      const result = [...partial];
      const remaining = [...pool];
      for (let s = fromSlot; s < 5; s++) {
        let bestIdx = -1;
        let bestScore = -Infinity;
        for (let p = 0; p < remaining.length; p++) {
          const test = [...result];
          test[s] = remaining[p];
          const r = DamageCalculator.calculate(baseStats, test, activeModules, selectedDamageType, isBetaEnabled, forceCrit);
          let score = 0;
          if (keepRange) score += (r.final_stats.range || 0) / Math.max(baseRangeVal, 1);
          if (minOverheat > 0) score += (r.final_stats.overheat || 0) / minOverheat;
          if (score > bestScore) { bestScore = score; bestIdx = p; }
        }
        if (bestIdx !== -1) { result[s] = remaining[bestIdx]; remaining.splice(bestIdx, 1); }
      }
      return result;
    };

    for (let i = 0; i < 5; i++) {
      let bestChipIndex = -1;
      let bestDpm = -1;
      let fallbackChipIndex = -1;
      let fallbackDpm = -1;

      for (let j = 0; j < currentPool.length; j++) {
        const testChips = [...selectedChips];
        testChips[i] = currentPool[j];

        const result = DamageCalculator.calculate(baseStats, testChips, activeModules, selectedDamageType, isBetaEnabled, forceCrit);
        const dpm = optimizeFor === 'general' ? result.general.dpm : result.spec_ops.dpm;

        if (dpm > fallbackDpm) { fallbackDpm = dpm; fallbackChipIndex = j; }

        if (hasConstraints) {
          const remainingPool = currentPool.filter((_, idx) => idx !== j);
          const optimistic = buildOptimisticCompletion(testChips, i + 1, remainingPool);
          if (!satisfiesConstraints(optimistic)) continue;
        }

        if (dpm > bestDpm) { bestDpm = dpm; bestChipIndex = j; }
      }

      // Use feasible best; fall back to unconstrained best if nothing feasible found
      const chosen = bestChipIndex !== -1 ? bestChipIndex : fallbackChipIndex;
      if (chosen !== -1) {
        selectedChips[i] = currentPool[chosen];
        currentPool.splice(chosen, 1);
      }
    }

    const finalChips: Stats[] = Array.from({ length: 5 }, () => ({ ...DEFAULT_CHIP_STATS }));
    const finalChipsFilled = new Array(5).fill(false);
    const usedSelectedIndices = new Set<number>();

    for (let i = 0; i < 5; i++) {
      const currentChip = currentChips[i];
      const isCurrentEmpty = !Object.entries(currentChip).some(([k, v]) => k !== 'level' && k !== 'number_of_cannons' && v !== 0);
      
      if (!isCurrentEmpty) {
        const matchIndex = selectedChips.findIndex((sc, idx) => {
          if (usedSelectedIndices.has(idx)) return false;
          const isScEmpty = !Object.entries(sc).some(([k, v]) => k !== 'level' && k !== 'number_of_cannons' && v !== 0);
          if (isScEmpty) return false;

          const allKeys = new Set([...Object.keys(sc), ...Object.keys(currentChip)]) as Set<keyof Stats>;
          
          for (const key of Array.from(allKeys)) {
             if (key === 'level' || (key as string) === 'note') continue;
             if ((sc[key] || 0) !== (currentChip[key] || 0)) return false;
          }
          return true;
        });

        if (matchIndex !== -1) {
          finalChips[i] = selectedChips[matchIndex];
          finalChipsFilled[i] = true;
          usedSelectedIndices.add(matchIndex);
        }
      }
    }

    let selectedIdx = 0;
    for (let i = 0; i < 5; i++) {
      if (!finalChipsFilled[i]) {
        while (selectedIdx < 5 && usedSelectedIndices.has(selectedIdx)) {
          selectedIdx++;
        }
        if (selectedIdx < 5) {
          finalChips[i] = selectedChips[selectedIdx];
          usedSelectedIndices.add(selectedIdx);
        }
      }
    }

    setPreviewChips(finalChips);

    // Post-check: warn only when the pool genuinely cannot satisfy constraints
    const finalResult = DamageCalculator.calculate(baseStats, finalChips, activeModules, selectedDamageType, isBetaEnabled, forceCrit);
    const warnings: string[] = [];

    if (keepRange && (finalResult.final_stats.range || 0) < baseRangeVal - 0.001) {
      warnings.push((texts as any).constraintViolatedRange + ' — ' + (texts as any).constraintViolatedNotApplicable);
    }
    if (minOverheat > 0 && (finalResult.final_stats.overheat || 0) < minOverheat - 0.001) {
      warnings.push((texts as any).constraintViolatedOverheat + ' — ' + (texts as any).constraintViolatedNotApplicable);
    }

    setConstraintWarnings(warnings);
  };

  const handleApply = () => {
    if (previewChips) {
      onApplyBuild(previewChips);
      handleClose();
    }
  };

  const handleClose = () => {
    setPreviewChips(null);
    setConstraintWarnings([]);
    onClose();
  };

  const currentResult = useMemo(() => {
    return DamageCalculator.calculate(baseStats, currentChips, activeModules, selectedDamageType, isBetaEnabled, forceCrit);
  }, [baseStats, currentChips, activeModules, selectedDamageType, isBetaEnabled, forceCrit]);

  const previewResult = useMemo(() => {
    if (!previewChips) return null;
    return DamageCalculator.calculate(baseStats, previewChips, activeModules, selectedDamageType, isBetaEnabled, forceCrit);
  }, [baseStats, previewChips, activeModules, selectedDamageType, isBetaEnabled, forceCrit]);

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
              
              <label className="flex items-center gap-2 cursor-pointer group" title={(texts as any).keepRangeHint}>
                <div className="relative flex items-center">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={keepRange}
                    onChange={(e) => setKeepRange(e.target.checked)}
                  />
                  <div className={`block w-8 h-5 rounded-full transition-colors ${keepRange ? 'bg-teal-500' : 'bg-slate-700'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${keepRange ? 'translate-x-3' : ''}`}></div>
                </div>
                <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">
                  {(texts as any).keepRange}
                </span>
              </label>

              <div title={(texts as any).minOverheatHint}>
                <label className="block text-xs font-medium text-slate-400 mb-1">{(texts as any).minOverheat}</label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={minOverheat}
                  onChange={(e) => setMinOverheat(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-sm text-slate-100 focus:border-teal-500 outline-none transition-colors h-8"
                />
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
                    const isBetter = isCooldown ? previewVal < currentVal : previewVal > currentVal;
                    const isWorse = isCooldown ? previewVal > currentVal : previewVal < currentVal;
                    
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

              {/* Slots schema */}
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                <h4 className="text-sm font-semibold text-slate-300 mb-2">{(texts as any).chipSlots || "Chip Slots"}</h4>
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4].map(idx => {
                    const currentChip = currentChips[idx];
                    const previewChip = previewChips![idx];
                    let changed = false;
                    
                    const isCurEmpty = !Object.entries(currentChip).some(([k, v]) => k !== 'level' && k !== 'number_of_cannons' && v !== 0);
                    const isPrevEmpty = !Object.entries(previewChip).some(([k, v]) => k !== 'level' && k !== 'number_of_cannons' && v !== 0);
                    
                    if (isCurEmpty && isPrevEmpty) {
                      changed = false;
                    } else if (isCurEmpty !== isPrevEmpty) {
                      changed = true;
                    } else {
                      const allKeys = new Set([...Object.keys(currentChip), ...Object.keys(previewChip)]) as Set<keyof Stats>;
                      for (const key of Array.from(allKeys)) {
                         if (key === 'level' || (key as string) === 'note') continue;
                         if ((currentChip[key] || 0) !== (previewChip[key] || 0)) {
                           changed = true;
                           break;
                         }
                      }
                    }

                    const slotRoman = ['I', 'II', 'III', 'IV', 'V'][idx];

                    return (
                      <div 
                        key={idx} 
                        className={`flex-1 flex flex-col items-center justify-center p-2 rounded border relative overflow-hidden transition-colors ${
                          changed 
                            ? 'bg-blue-500/10 border-blue-500/30' 
                            : 'bg-slate-900/40 border-slate-800'
                        }`}
                        title={changed ? ((texts as any).slotChanged || "Changed") : ((texts as any).slotUnchanged || "Unchanged")}
                      >
                        <span className={`text-xs font-bold mb-1 z-10 ${changed ? 'text-blue-300' : 'text-slate-500'}`}>{slotRoman}</span>
                        <div className={`w-1.5 h-1.5 rounded-full z-10 ${changed ? 'bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.8)]' : 'bg-slate-700'}`}></div>
                        {changed && (
                          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-blue-500/20 to-transparent"></div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-3 pl-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                    <span className="text-[10px] text-slate-500">{(texts as any).slotUnchanged || "Unchanged"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_3px_rgba(96,165,250,0.8)]"></div>
                    <span className="text-[10px] text-blue-400">{(texts as any).slotChanged || "Changed"}</span>
                  </div>
                </div>
              </div>
              {/* Constraint warnings */}
              {constraintWarnings.length > 0 && (
                <div className="bg-red-900/20 border border-red-500/40 rounded-lg p-2.5 space-y-1">
                  {constraintWarnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-red-300">
                      <span className="mt-0.5 shrink-0">⚠️</span>
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}
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
