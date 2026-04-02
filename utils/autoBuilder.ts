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
  minRange: number;
  minOverheat: number;
}

export interface AutoBuilderResult {
  chips: Stats[];
  constraintWarnings: string[];
}

export function runAutoBuilder(opts: AutoBuilderOptions): AutoBuilderResult {
  const {
    baseStats, currentChips, pool, activeModules,
    selectedDamageType, isBetaEnabled, forceCrit,
    optimizeFor, minRange, minOverheat,
  } = opts;

  const hasConstraints = minRange > 0 || minOverheat > 0;

  // Combine pool and currentChips to ensure current chips are always available as a baseline
  const masterPool = [...pool];
  const isChipEmptyFn = (c: Stats) =>
    !Object.entries(c).some(([k, v]) => k !== 'level' && k !== 'number_of_cannons' && v !== 0);

  const currentIndices: number[] = [];
  for (let i = 0; i < 5; i++) {
    const cur = currentChips[i];
    if (isChipEmptyFn(cur)) {
      currentIndices.push(-1);
      continue;
    }
    let match = masterPool.findIndex(p => {
      const keys = new Set([...Object.keys(p), ...Object.keys(cur)]);
      for (const k of Array.from(keys)) {
        if (k === 'level' || k === 'note') continue;
        if ((p[k as keyof Stats] || 0) !== (cur[k as keyof Stats] || 0)) return false;
      }
      return true;
    });
    if (match === -1) {
      match = masterPool.length;
      masterPool.push(cur);
    }
    currentIndices.push(match);
  }

  const evaluateState = (indices: number[]) => {
    const testChips = indices.map(idx => idx === -1 ? { ...DEFAULT_CHIP_STATS } : masterPool[idx]);
    const r = DamageCalculator.calculate(baseStats, testChips, activeModules, selectedDamageType, isBetaEnabled, forceCrit);
    const dpm = optimizeFor === 'general' ? r.general.dpm : r.spec_ops.dpm;

    let valid = true;
    let penalty = 1.0;

    if (minRange > 0) {
      const range = r.final_stats.range || 0;
      if (range < minRange - 0.001) {
        valid = false;
        penalty *= Math.pow(Math.max(0.001, range) / minRange, 20); // Sharp penalty for invalid range
      }
    }
    if (minOverheat > 0) {
      const oh = r.final_stats.overheat || 0;
      if (oh < minOverheat - 0.001) {
        valid = false;
        penalty *= Math.pow(Math.max(0.001, oh) / minOverheat, 20);
      }
    }

    return { 
      chips: testChips, 
      dpm, 
      valid: !hasConstraints || valid, 
      score: dpm * penalty,
      final_stats: r.final_stats
    };
  };

  const doLocalSearch = (startIndices: number[]) => {
    let current = [...startIndices];
    let evalRes = evaluateState(current);
    
    let improved = true;
    let attempts = 0;
    while (improved && attempts < 10) {
      improved = false;
      attempts++;
      
      for (let i = 0; i < 5; i++) {
        let bestLocalScore = evalRes.score;
        let bestLocalValid = evalRes.valid;
        let bestLocalIdx = current[i];
        let foundBetter = false;

        for (let j = 0; j < masterPool.length; j++) {
          if (current.includes(j) && current[i] !== j) continue; // No duplicate chips allowed
          
          const test = [...current];
          test[i] = j;
          const r = evaluateState(test);

          if (!bestLocalValid && r.valid) {
            bestLocalScore = r.score;
            bestLocalValid = r.valid;
            bestLocalIdx = j;
            foundBetter = true;
          } else if (bestLocalValid === r.valid && r.score > bestLocalScore + 0.001) {
            bestLocalScore = r.score;
            bestLocalValid = r.valid;
            bestLocalIdx = j;
            foundBetter = true;
          }
        }
        
        if (foundBetter) {
          current[i] = bestLocalIdx;
          evalRes = evaluateState(current);
          improved = true;
        }
      }
    }
    return { indices: current, resultEval: evalRes };
  };

  // Start configurations to avoid local minima
  const starts: number[][] = [currentIndices];

  for (let s = 0; s < 5; s++) {
    const rnd: number[] = [];
    const used = new Set<number>();
    for (let i = 0; i < 5; i++) {
      if (masterPool.length === 0) { rnd.push(-1); continue; }
      let j = Math.floor(Math.random() * masterPool.length);
      let tries = 0;
      while (used.has(j) && tries < 20) { j = Math.floor(Math.random() * masterPool.length); tries++; }
      rnd.push(used.has(j) ? -1 : j);
      used.add(j);
    }
    starts.push(rnd);
  }

  const singleScores = masterPool.map((_, idx) => {
    const test = Array(5).fill(-1);
    test[0] = idx;
    return { idx, score: evaluateState(test).score };
  });
  // Sort descending
  singleScores.sort((a, b) => b.score - a.score);
  const greedyIndices: number[] = [];
  for (let i = 0; i < singleScores.length && greedyIndices.length < 5; i++) {
    greedyIndices.push(singleScores[i].idx);
  }
  while (greedyIndices.length < 5) greedyIndices.push(-1);
  starts.push(greedyIndices);

  let bestResult = doLocalSearch(starts[0]);

  for (let i = 1; i < starts.length; i++) {
    const r = doLocalSearch(starts[i]);
    if (!bestResult.resultEval.valid && r.resultEval.valid) {
      bestResult = r;
    } else if (bestResult.resultEval.valid === r.resultEval.valid && r.resultEval.score > bestResult.resultEval.score + 0.001) {
      bestResult = r;
    }
  }

  const finalChips = bestResult.resultEval.chips;
  const constraintWarnings: string[] = [];

  if (minRange > 0 && (bestResult.resultEval.final_stats.range || 0) < minRange - 0.001) {
    constraintWarnings.push('minRange');
  }
  if (minOverheat > 0 && (bestResult.resultEval.final_stats.overheat || 0) < minOverheat - 0.001) {
    constraintWarnings.push('minOverheat');
  }

  // Preserve positions of current chips where possible to prevent UI shuffling
  const finalStabilised: Stats[] = Array.from({ length: 5 }, () => ({ ...DEFAULT_CHIP_STATS }));
  const usedBestIndices = new Set<number>();
  const finalChipsFilled = new Array(5).fill(false);

  for (let i = 0; i < 5; i++) {
    const cur = currentChips[i];
    if (isChipEmptyFn(cur)) continue;

    const matchIndex = finalChips.findIndex((sc, idx) => {
      if (usedBestIndices.has(idx)) return false;
      if (isChipEmptyFn(sc)) return false;
      const allKeys = new Set([...Object.keys(sc), ...Object.keys(cur)]) as Set<keyof Stats>;
      for (const key of Array.from(allKeys)) {
        if (key === 'level' || (key as string) === 'note') continue;
        if ((sc[key] || 0) !== (cur[key] || 0)) return false;
      }
      return true;
    });

    if (matchIndex !== -1) {
      finalStabilised[i] = finalChips[matchIndex];
      finalChipsFilled[i] = true;
      usedBestIndices.add(matchIndex);
    }
  }

  let selectedIdx = 0;
  for (let i = 0; i < 5; i++) {
    if (!finalChipsFilled[i]) {
      while (selectedIdx < 5 && usedBestIndices.has(selectedIdx)) selectedIdx++;
      if (selectedIdx < 5) {
        finalStabilised[i] = finalChips[selectedIdx];
        usedBestIndices.add(selectedIdx);
      }
    }
  }

  return { chips: finalStabilised, constraintWarnings };
}
