import React, { useState, useMemo, useEffect } from 'react';
import { Stats, SavedChip, SavedConfig, ModuleState, DamageType, StatKey } from '../types';
import { UI_TEXT } from '../constants';

import { DamageCalculator } from '../services/calculator';
import { runAutoBuilder } from '../utils/autoBuilder';
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
  labels,
}) => {
  const [useOnlyAvailable, setUseOnlyAvailable] = useState(true);
  const [optimizeFor, setOptimizeFor] = useState<'general' | 'spec_ops'>('general');
  const [minRange, setMinRange] = useState(0);
  const [minOverheat, setMinOverheat] = useState(0);
  const [previewChips, setPreviewChips] = useState<Stats[] | null>(null);
  const [constraintWarnings, setConstraintWarnings] = useState<string[]>([]);

  // Build the available chip pool
  const availableChips = useMemo(() => {
    let pool = savedChips.filter(c => c.level <= shipRank);

    if (useOnlyAvailable) {
      const usedChips: Stats[] = [];
      savedConfigs.forEach(config => {
        if (!config.isTemporary) {
          config.chips
            .filter(c => Object.values(c).some(v => v !== 0))
            .forEach(usedChip => {
              const isCurrentShipChip = currentChips.some(curChip => {
                const keys = new Set([...Object.keys(curChip), ...Object.keys(usedChip)]);
                for (const key of Array.from(keys)) {
                  if (key === 'level' || key === 'note') continue;
                  if ((curChip[key as keyof Stats] || 0) !== (usedChip[key as keyof Stats] || 0)) return false;
                }
                return true;
              });
              if (!isCurrentShipChip) usedChips.push(usedChip);
            });
        }
      });

      const poolCopy = [...pool];
      usedChips.forEach(usedChip => {
        const index = poolCopy.findIndex(c => {
          const keys = new Set([...Object.keys(c.stats), ...Object.keys(usedChip)]);
          for (const key of Array.from(keys)) {
            if (key === 'level' || key === 'note') continue;
            if ((c.stats[key] || 0) !== (usedChip[key as keyof Stats] || 0)) return false;
          }
          return true;
        });
        if (index !== -1) poolCopy.splice(index, 1);
      });
      pool = poolCopy;
    }

    return pool.map(c => ({ ...c.stats, level: c.level }));
    return pool.map(c => ({ ...c.stats, level: c.level }));
  }, [savedChips, savedConfigs, currentChips, shipRank, useOnlyAvailable]);

  const currentResult = useMemo(() => {
    return DamageCalculator.calculate(baseStats, currentChips, activeModules, selectedDamageType, isBetaEnabled, forceCrit);
  }, [baseStats, currentChips, activeModules, selectedDamageType, isBetaEnabled, forceCrit]);

  useEffect(() => {
    if (isOpen) {
      setMinRange(Math.round((currentResult.final_stats.range || 0) * 10) / 10);
      setMinOverheat(Math.round((currentResult.final_stats.overheat || 0) * 10) / 10);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleCalculate = () => {
    const { chips, constraintWarnings: rawWarnings } = runAutoBuilder({
      baseStats,
      currentChips,
      pool: availableChips,
      activeModules,
      selectedDamageType,
      isBetaEnabled,
      forceCrit,
      optimizeFor,
      minRange,
      minOverheat,
    });

    setPreviewChips(chips);

    // Translate internal warning keys to display strings
    const displayWarnings = rawWarnings.map(w => {
      if (w === 'minRange') {
        return (texts as any).constraintViolatedRange + ' — ' + (texts as any).constraintViolatedNotApplicable;
      }
      if (w === 'minOverheat') {
        return (texts as any).constraintViolatedOverheat + ' — ' + (texts as any).constraintViolatedNotApplicable;
      }
      return w;
    });
    setConstraintWarnings(displayWarnings);
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
            <ConfigPanel
              useOnlyAvailable={useOnlyAvailable}
              optimizeFor={optimizeFor}
              minRange={minRange}
              minOverheat={minOverheat}
              availableChipsCount={availableChips.length}
              shipRank={shipRank}
              texts={texts}
              onSetUseOnlyAvailable={setUseOnlyAvailable}
              onSetOptimizeFor={setOptimizeFor}
              onSetMinRange={setMinRange}
              onSetMinOverheat={setMinOverheat}
            />
          ) : (
            <PreviewPanel
              currentResult={currentResult}
              previewResult={previewResult!}
              currentChips={currentChips}
              previewChips={previewChips}
              constraintWarnings={constraintWarnings}
              texts={texts}
              labels={labels}
            />
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ConfigPanelProps {
  useOnlyAvailable: boolean;
  optimizeFor: 'general' | 'spec_ops';
  minRange: number;
  minOverheat: number;
  availableChipsCount: number;
  shipRank: number;
  texts: typeof UI_TEXT['en'];
  onSetUseOnlyAvailable: (v: boolean) => void;
  onSetOptimizeFor: (v: 'general' | 'spec_ops') => void;
  onSetMinRange: (v: number) => void;
  onSetMinOverheat: (v: number) => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({
  useOnlyAvailable, optimizeFor, minRange, minOverheat,
  availableChipsCount, shipRank, texts,
  onSetUseOnlyAvailable, onSetOptimizeFor, onSetMinRange, onSetMinOverheat,
}) => (
  <div className="space-y-3">
    {/* Use only available toggle */}
    <label className="flex items-center gap-2 cursor-pointer group">
      <div className="relative flex items-center">
        <input type="checkbox" className="sr-only" checked={useOnlyAvailable} onChange={e => onSetUseOnlyAvailable(e.target.checked)} />
        <div className={`block w-8 h-5 rounded-full transition-colors ${useOnlyAvailable ? 'bg-blue-500' : 'bg-slate-700'}`} />
        <div className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${useOnlyAvailable ? 'translate-x-3' : ''}`} />
      </div>
      <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">
        {texts.useOnlyAvailable}
      </span>
    </label>

    {/* Optimize for */}
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{texts.optimizeFor}</label>
      <div className="flex gap-2">
        <button
          onClick={() => onSetOptimizeFor('general')}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors border ${
            optimizeFor === 'general'
              ? 'bg-blue-600/20 border-blue-500 text-blue-400'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
          }`}
        >
          {texts.general}
        </button>
        <button
          onClick={() => onSetOptimizeFor('spec_ops')}
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

    {/* Min range */}
    <div title={(texts as any).minRangeHint} className="flex items-center justify-between">
      <label className="text-xs font-medium text-slate-400 mb-0 w-1/2">{(texts as any).minRange}</label>
      <input
        type="number"
        min={0}
        step={0.1}
        value={minRange}
        onChange={e => onSetMinRange(Math.max(0, Number(e.target.value)))}
        className="w-1/2 bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-sm text-slate-100 focus:border-teal-500 outline-none transition-colors h-8"
      />
    </div>

    {/* Min overheat */}
    <div title={(texts as any).minOverheatHint} className="flex items-center justify-between">
      <label className="text-xs font-medium text-slate-400 mb-0 w-1/2">{(texts as any).minOverheat}</label>
      <input
        type="number"
        min={0}
        step={0.1}
        value={minOverheat}
        onChange={e => onSetMinOverheat(Math.max(0, Number(e.target.value)))}
        className="w-1/2 bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-sm text-slate-100 focus:border-teal-500 outline-none transition-colors h-8"
      />
    </div>

    {/* Info */}
    <div className="bg-slate-800/50 p-2.5 rounded border border-slate-700 text-xs text-slate-400">
      {texts.foundChips} <strong className="text-slate-200">{availableChipsCount}</strong> {texts.matchingCriteria} (&lt;= {shipRank}).
    </div>
  </div>
);

// ---------------------------------------------------------------------------

import { CalculationResult } from '../types';

interface PreviewPanelProps {
  currentResult: CalculationResult;
  previewResult: CalculationResult;
  currentChips: Stats[];
  previewChips: Stats[];
  constraintWarnings: string[];
  texts: typeof UI_TEXT['en'];
  labels: Record<string, string>;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({
  currentResult, previewResult, currentChips, previewChips, constraintWarnings, texts, labels,
}) => {
  const dpmColor = (cur: number, prev: number) =>
    prev > cur ? 'text-emerald-400' : prev < cur ? 'text-red-400' : 'text-slate-300';

  return (
    <div className="space-y-4">
      {/* DPM comparison */}
      <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
        <h4 className="text-sm font-semibold text-slate-300 mb-2">{texts.previewChanges || 'Preview Changes'}</h4>
        <div className="grid grid-cols-2 gap-4">
          {(['general', 'spec_ops'] as const).map(mode => (
            <div key={mode}>
              <div className="text-xs text-slate-400 mb-1">
                {mode === 'general' ? texts.general : texts.specOps} {texts.dpm}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-300">
                  {currentResult[mode].dpm.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                </span>
                <ArrowRight className="w-3 h-3 text-slate-500" />
                <span className={`text-sm font-bold ${dpmColor(currentResult[mode].dpm, previewResult[mode].dpm)}`}>
                  {previewResult[mode].dpm.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Final attributes comparison */}
      <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
        <h4 className="text-sm font-semibold text-slate-300 mb-2">{texts.finalAttributes || 'Final Attributes'}</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(['fire_rate', 'range', 'crit_chance', 'crit_power', 'overheat', 'cooldown'] as StatKey[]).map(key => {
            const currentVal = currentResult.final_stats[key] || 0;
            const previewVal = previewResult.final_stats[key] || 0;
            if (currentVal === previewVal && currentVal === 0) return null;

            const isCooldown = key === 'cooldown';
            const isOverheat = key === 'overheat';
            const isBetter = isCooldown ? previewVal < currentVal : previewVal > currentVal;
            const isWorse  = isCooldown ? previewVal > currentVal : previewVal < currentVal;
            const colorClass = isBetter ? 'text-emerald-400' : isWorse ? 'text-red-400' : 'text-slate-300';

            const fmt = (v: number) => isOverheat
              ? v.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
              : v.toLocaleString(undefined, { maximumFractionDigits: 2 });

            return (
              <div key={key} className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-medium mb-0.5">{labels[key]}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-300">{fmt(currentVal)}</span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className={`text-xs font-bold ${colorClass}`}>{fmt(previewVal)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chip slots schema */}
      <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
        <h4 className="text-sm font-semibold text-slate-300 mb-2">{(texts as any).chipSlots || 'Chip Slots'}</h4>
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map(idx => {
            const cur = currentChips[idx];
            const prev = previewChips[idx];
            const isSlotEmpty = (c: Stats) =>
              !Object.entries(c).some(([k, v]) => k !== 'level' && k !== 'number_of_cannons' && v !== 0);

            const isCurEmpty = isSlotEmpty(cur);
            const isPrevEmpty = isSlotEmpty(prev);

            let changed = false;
            if (!isCurEmpty || !isPrevEmpty) {
              if (isCurEmpty !== isPrevEmpty) {
                changed = true;
              } else {
                const allKeys = new Set([...Object.keys(cur), ...Object.keys(prev)]) as Set<keyof Stats>;
                for (const key of Array.from(allKeys)) {
                  if (key === 'level' || (key as string) === 'note') continue;
                  if ((cur[key] || 0) !== (prev[key] || 0)) { changed = true; break; }
                }
              }
            }

            const roman = ['I', 'II', 'III', 'IV', 'V'][idx];
            return (
              <div
                key={idx}
                className={`flex-1 flex flex-col items-center justify-center p-2 rounded border relative overflow-hidden transition-colors ${
                  changed ? 'bg-blue-500/10 border-blue-500/30' : 'bg-slate-900/40 border-slate-800'
                }`}
                title={changed ? ((texts as any).slotChanged || 'Changed') : ((texts as any).slotUnchanged || 'Unchanged')}
              >
                <span className={`text-xs font-bold mb-1 z-10 ${changed ? 'text-blue-300' : 'text-slate-500'}`}>{roman}</span>
                <div className={`w-1.5 h-1.5 rounded-full z-10 ${changed ? 'bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.8)]' : 'bg-slate-700'}`} />
                {changed && <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-blue-500/20 to-transparent" />}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 pl-1">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
            <span className="text-[10px] text-slate-500">{(texts as any).slotUnchanged || 'Unchanged'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_3px_rgba(96,165,250,0.8)]" />
            <span className="text-[10px] text-blue-400">{(texts as any).slotChanged || 'Changed'}</span>
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
  );
};
