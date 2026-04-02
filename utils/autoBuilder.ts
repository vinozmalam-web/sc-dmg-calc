import { Stats, ModuleState, DamageType } from '../types';
import { DEFAULT_CHIP_STATS } from '../constants';
import { DamageCalculator } from '../services/calculator';

export interface AutoBuilderOptions {
  baseStats: Stats;
  currentChips: Stats[];
  pool: Stats[];           // available chip pool (already filtered by rank / availability)
  activeModules: Record<string, ModuleState>;
  selectedDamageType: DamageType;
  isBetaEnabled: boolean;
  forceCrit: boolean;
  optimizeFor: 'general' | 'spec_ops';
  keepRange: boolean;
  minOverheat: number;
}

export interface AutoBuilderResult {
  chips: Stats[];
  constraintWarnings: string[];
}

/**
 * Greedy auto-builder algorithm with look-ahead constraint enforcement.
 *
 * For each slot it picks the chip from `pool` that maximises DPM while
 * keeping the constraints feasible.  If no feasible chip exists for a slot
 * the best unconstrained chip is used as a fallback and a warning is issued.
 *
 * After building, chip positions are stabilised: chips that were already on
 * the current ship keep their original slot indices.
 */
export function runAutoBuilder(opts: AutoBuilderOptions): AutoBuilderResult {
  const {
    baseStats, currentChips, pool, activeModules,
    selectedDamageType, isBetaEnabled, forceCrit,
    optimizeFor, keepRange, minOverheat,
  } = opts;

  const hasConstraints = keepRange || minOverheat > 0;

  const baseResult = DamageCalculator.calculate(
    baseStats, currentChips, activeModules, selectedDamageType, isBetaEnabled, forceCrit
  );
  const baseRangeVal = baseResult.final_stats.range || 0;

  const satisfiesConstraints = (chips: Stats[]): boolean => {
    if (!hasConstraints) return true;
    const r = DamageCalculator.calculate(baseStats, chips, activeModules, selectedDamageType, isBetaEnabled, forceCrit);
    if (keepRange && (r.final_stats.range || 0) < baseRangeVal - 0.001) return false;
    if (minOverheat > 0 && (r.final_stats.overheat || 0) < minOverheat - 0.001) return false;
    return true;
  };

  const buildOptimisticCompletion = (partial: Stats[], fromSlot: number, remaining: Stats[]): Stats[] => {
    const result = [...partial];
    const rem = [...remaining];
    for (let s = fromSlot; s < 5; s++) {
      let bestIdx = -1;
      let bestScore = -Infinity;
      for (let p = 0; p < rem.length; p++) {
        const test = [...result];
        test[s] = rem[p];
        const r = DamageCalculator.calculate(baseStats, test, activeModules, selectedDamageType, isBetaEnabled, forceCrit);
        let score = 0;
        if (keepRange) score += (r.final_stats.range || 0) / Math.max(baseRangeVal, 1);
        if (minOverheat > 0) score += (r.final_stats.overheat || 0) / minOverheat;
        if (score > bestScore) { bestScore = score; bestIdx = p; }
      }
      if (bestIdx !== -1) { result[s] = rem[bestIdx]; rem.splice(bestIdx, 1); }
    }
    return result;
  };

  // --- Phase 1: greedy selection ---
  let selectedChips: Stats[] = Array.from({ length: 5 }, () => ({ ...DEFAULT_CHIP_STATS }));
  let currentPool = [...pool];

  for (let i = 0; i < 5; i++) {
    let bestChipIndex = -1;
    let bestDpm = -1;
    let fallbackChipIndex = -1;
    let fallbackDpm = -1;

    for (let j = 0; j < currentPool.length; j++) {
      const testChips = [...selectedChips];
      testChips[i] = currentPool[j];

      const r = DamageCalculator.calculate(baseStats, testChips, activeModules, selectedDamageType, isBetaEnabled, forceCrit);
      const dpm = optimizeFor === 'general' ? r.general.dpm : r.spec_ops.dpm;

      if (dpm > fallbackDpm) { fallbackDpm = dpm; fallbackChipIndex = j; }

      if (hasConstraints) {
        const remainingPool = currentPool.filter((_, idx) => idx !== j);
        const optimistic = buildOptimisticCompletion(testChips, i + 1, remainingPool);
        if (!satisfiesConstraints(optimistic)) continue;
      }

      if (dpm > bestDpm) { bestDpm = dpm; bestChipIndex = j; }
    }

    const chosen = bestChipIndex !== -1 ? bestChipIndex : fallbackChipIndex;
    if (chosen !== -1) {
      selectedChips[i] = currentPool[chosen];
      currentPool.splice(chosen, 1);
    }
  }

  // --- Phase 2: stabilise positions (keep existing chips in original slots) ---
  const finalChips: Stats[] = Array.from({ length: 5 }, () => ({ ...DEFAULT_CHIP_STATS }));
  const finalChipsFilled = new Array(5).fill(false);
  const usedSelectedIndices = new Set<number>();

  const isChipEmptyFn = (c: Stats) =>
    !Object.entries(c).some(([k, v]) => k !== 'level' && k !== 'number_of_cannons' && v !== 0);

  for (let i = 0; i < 5; i++) {
    const cur = currentChips[i];
    if (isChipEmptyFn(cur)) continue;

    const matchIndex = selectedChips.findIndex((sc, idx) => {
      if (usedSelectedIndices.has(idx)) return false;
      if (isChipEmptyFn(sc)) return false;
      const allKeys = new Set([...Object.keys(sc), ...Object.keys(cur)]) as Set<keyof Stats>;
      for (const key of Array.from(allKeys)) {
        if (key === 'level' || (key as string) === 'note') continue;
        if ((sc[key] || 0) !== (cur[key] || 0)) return false;
      }
      return true;
    });

    if (matchIndex !== -1) {
      finalChips[i] = selectedChips[matchIndex];
      finalChipsFilled[i] = true;
      usedSelectedIndices.add(matchIndex);
    }
  }

  let selectedIdx = 0;
  for (let i = 0; i < 5; i++) {
    if (!finalChipsFilled[i]) {
      while (selectedIdx < 5 && usedSelectedIndices.has(selectedIdx)) selectedIdx++;
      if (selectedIdx < 5) {
        finalChips[i] = selectedChips[selectedIdx];
        usedSelectedIndices.add(selectedIdx);
      }
    }
  }

  // --- Phase 3: post-check warnings ---
  const finalResult = DamageCalculator.calculate(baseStats, finalChips, activeModules, selectedDamageType, isBetaEnabled, forceCrit);
  const constraintWarnings: string[] = [];

  if (keepRange && (finalResult.final_stats.range || 0) < baseRangeVal - 0.001) {
    constraintWarnings.push('keepRange');
  }
  if (minOverheat > 0 && (finalResult.final_stats.overheat || 0) < minOverheat - 0.001) {
    constraintWarnings.push('minOverheat');
  }

  return { chips: finalChips, constraintWarnings };
}
