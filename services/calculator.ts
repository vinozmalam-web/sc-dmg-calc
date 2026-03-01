import { Stats, CalculationResult, ReplacementResult, StatKey, ModuleState, DamageType } from '../types';

export class DamageCalculator {
  
  // Helper to calculate mod from Z value
  private static getMod(z: number): number {
    if (z <= -99.99) return -1000; 
    
    if (z < 0) {
        return 1.0 - (100.0 / (100.0 + z));
    }
    return z / 100.0;
  }

  // Helper to calculate final value based on base and list of Z values
  private static calculateFinalValue(base: number, zValues: number[]): { value: number, modSum: number } {
    let modSum = 0;
    zValues.forEach(z => {
        modSum += this.getMod(z);
    });

    let value = 0;
    if (modSum < 0) {
      value = base / (1.0 - modSum);
    } else {
      value = base * (1.0 + modSum);
    }
    
    return { value, modSum };
  }

  static calculate(
    baseStats: Stats, 
    chips: Stats[], 
    activeModules: Record<string, ModuleState> = {},
    selectedDamageType: DamageType = 'em'
  ): CalculationResult {
    // Helper to extract non-zero Z values for a specific key from all chips AND active modules
    const getZValues = (key: string): number[] => {
        const chipVals = chips.map(c => c[key] || 0);
        const moduleVals = Object.values(activeModules)
            .filter(m => m.enabled)
            .map(m => m.values[key as StatKey] || 0);
        
        return [...chipVals, ...moduleVals].filter(v => v !== 0);
    };

    // --- Stage 1: D1 (Base Damage + Generic Damage + Matching Elemental Damage) ---
    const genericDmgZ = getZValues('damage');
    
    // Select the specific damage key based on user selection
    let specificDmgZ: number[] = [];
    if (selectedDamageType === 'em') {
        specificDmgZ = getZValues('dmg_em');
    } else if (selectedDamageType === 'thermal') {
        specificDmgZ = getZValues('dmg_thermal');
    } else if (selectedDamageType === 'kinetic') {
        specificDmgZ = getZValues('dmg_kinetic');
    }
    
    const d1Z = [...genericDmgZ, ...specificDmgZ];
    
    const d1Result = this.calculateFinalValue(baseStats.damage || 0, d1Z);
    const d1 = d1Result.value;

    // --- Stage 2: D2 (D1 + Destroyers) ---
    const d2Z = getZValues('dmg_destroyers');
    const d2Result = this.calculateFinalValue(d1, d2Z);
    const d2 = d2Result.value;

    // --- Stage 3: D3 (D2 + Aliens) ---
    const d3Z = getZValues('dmg_aliens');
    const d3Result = this.calculateFinalValue(d2, d3Z);
    const d3 = d3Result.value;

    // --- Stage 4: Final Attributes (Standard Stats) ---
    const finalStats: Stats = {};
    const mods: Record<string, number> = {};
    
    const statKeys: StatKey[] = ["fire_rate", "range", "crit_chance", "crit_power", "overheat", "cooldown"];
    
    statKeys.forEach(key => {
        const zVals = getZValues(key);
        const res = this.calculateFinalValue(baseStats[key] || 0, zVals);
        finalStats[key] = res.value;
        mods[key] = res.modSum;
    });

    // --- Stage 5: Final DPS/DPM Calculations ---
    const f_fr = finalStats.fire_rate || 0;
    const f_cc = finalStats.crit_chance || 0;
    const f_cp = finalStats.crit_power || 0;
    const f_oh = finalStats.overheat || 0;
    const f_cd = finalStats.cooldown || 0;
    
    const dpm_denom = (f_oh + f_cd) !== 0 ? (f_oh + f_cd) : 1.0;

    const calculateMode = (baseDmg: number) => {
      const clean_dps = ((baseDmg * f_fr) / 60.0);
      const crit_dps = clean_dps * (f_cc / 100.0) * (1.0 + (f_cp / 100.0));
      const total_dps = clean_dps + crit_dps;
      const dpm = (60.0 / dpm_denom) * total_dps * f_oh;
      return { clean_dps, crit_dps, total_dps, dpm };
    };

    const spec_ops = calculateMode(d3);
    const general = calculateMode(d1);

    return {
      spec_ops,
      general,
      final_stats: finalStats,
      intermediate: { d1, d2, d3 }
    };
  }

  static findBestReplacement(
    baseStats: Stats, 
    currentChips: Stats[], 
    candidateChip: Stats,
    activeModules: Record<string, ModuleState> = {},
    selectedDamageType: DamageType = 'em'
  ): ReplacementResult[] {
    const baseline = this.calculate(baseStats, currentChips, activeModules, selectedDamageType);
    const results: ReplacementResult[] = [];

    const isCandidateEmpty = Object.values(candidateChip).every(v => v === 0);
    if (isCandidateEmpty) return [];

    for (let i = 0; i < currentChips.length; i++) {
        const tempChips = [...currentChips];
        tempChips[i] = candidateChip;

        const newRes = this.calculate(baseStats, tempChips, activeModules, selectedDamageType);

        results.push({
            replaced_index: i,
            spec_ops: {
                dpm_delta: newRes.spec_ops.dpm - baseline.spec_ops.dpm,
                dps_delta: newRes.spec_ops.total_dps - baseline.spec_ops.total_dps,
                new_dpm: newRes.spec_ops.dpm,
            },
            general: {
                dpm_delta: newRes.general.dpm - baseline.general.dpm,
                dps_delta: newRes.general.total_dps - baseline.general.total_dps,
                new_dpm: newRes.general.dpm,
            },
            range_delta: (newRes.final_stats.range || 0) - (baseline.final_stats.range || 0)
        });
    }

    return results;
  }
}