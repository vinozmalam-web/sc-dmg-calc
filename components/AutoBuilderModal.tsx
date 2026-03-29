import React, { useState, useMemo } from 'react';
import { Stats, SavedChip, SavedConfig, ModuleState, DamageType } from '../types';
import { UI_TEXT } from '../constants';
import { DamageCalculator } from '../services/calculator';
import { X, Settings, Zap } from 'lucide-react';

interface AutoBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedChips: SavedChip[];
  savedConfigs: SavedConfig[];
  baseStats: Stats;
  activeModules: Record<string, ModuleState>;
  selectedDamageType: DamageType;
  shipRank: number;
  isBetaEnabled: boolean;
  onApplyBuild: (chips: Stats[]) => void;
  texts: typeof UI_TEXT['en'];
}

export const AutoBuilderModal: React.FC<AutoBuilderModalProps> = ({
  isOpen,
  onClose,
  savedChips,
  savedConfigs,
  baseStats,
  activeModules,
  selectedDamageType,
  shipRank,
  isBetaEnabled,
  onApplyBuild,
  texts
}) => {
  const [useOnlyAvailable, setUseOnlyAvailable] = useState(true);
  const [optimizeFor, setOptimizeFor] = useState<'general' | 'spec_ops'>('general');

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

    return pool.map(c => c.stats);
  }, [savedChips, savedConfigs, shipRank, useOnlyAvailable]);

  const handleBuild = () => {
    // Simple greedy algorithm for now:
    // Start with empty chips
    // For each slot (0 to 4), find the best chip from the pool that maximizes the target DPM
    // Remove that chip from the pool and continue
    // This is a heuristic, not guaranteed optimal, but good enough for a start.
    
    let currentChips: Stats[] = Array(5).fill({});
    let currentPool = [...availableChips];

    for (let i = 0; i < 5; i++) {
      let bestChipIndex = -1;
      let bestDpm = -1;

      for (let j = 0; j < currentPool.length; j++) {
        const testChips = [...currentChips];
        testChips[i] = currentPool[j];
        
        const result = DamageCalculator.calculate(baseStats, testChips, activeModules, selectedDamageType, isBetaEnabled);
        const dpm = optimizeFor === 'general' ? result.general.dpm : result.spec_ops.dpm;

        if (dpm > bestDpm) {
          bestDpm = dpm;
          bestChipIndex = j;
        }
      }

      if (bestChipIndex !== -1) {
        currentChips[i] = currentPool[bestChipIndex];
        currentPool.splice(bestChipIndex, 1);
      }
    }

    onApplyBuild(currentChips);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            {texts.autoBuilder}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
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

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {texts.cancel}
            </button>
            <button
              onClick={handleBuild}
              disabled={availableChips.length === 0}
              className="px-3 py-1.5 rounded text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" />
              {texts.build}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
