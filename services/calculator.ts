import { Stats, CalculationResult, ReplacementResult } from '../types';
import { CHIP_STATS_KEYS } from '../constants';

export class DamageCalculator {
  
  static calculate(baseStats: Stats, chips: Stats[]): CalculationResult {
    // --- Stage 1: Bonus Totals ---
    // Sum all bonuses from chips
    const bonuses: Stats = {};
    
    // Initialize
    CHIP_STATS_KEYS.forEach(key => bonuses[key] = 0);

    // Sum
    chips.forEach(chip => {
      CHIP_STATS_KEYS.forEach(key => {
        bonuses[key] += (chip[key] || 0);
      });
    });

    // Normalize (divide by 100)
    const normalizedBonuses: Stats = {};
    for (const key in bonuses) {
      normalizedBonuses[key] = bonuses[key] / 100.0;
    }

    // --- Stage 2: Intermediate Coefficients (d1 - d3) ---
    const b_dmg = baseStats.damage || 0;

    // d1 = BaseDmg * (1 + BonusElem + BonusDmg)
    const d1 = b_dmg * (1.0 + (normalizedBonuses.elem_damage || 0) + (normalizedBonuses.damage || 0));

    // d2 = d1 * (1 + BonusDestroyers)
    const d2 = d1 * (1.0 + (normalizedBonuses.dmg_destroyers || 0));

    // d3 = d2 * (1 + BonusAliens)
    const d3 = d2 * (1.0 + (normalizedBonuses.dmg_aliens || 0));

    // --- Stage 3: Final Attributes ---
    const finalStats: Stats = {};
    
    // Standard multiplier logic: Base * (1 + Bonus)
    const directMultipliers = ["fire_rate", "range", "crit_chance", "crit_power", "overheat"];
    directMultipliers.forEach(stat => {
      finalStats[stat] = (baseStats[stat] || 0) * (1.0 + (normalizedBonuses[stat] || 0));
    });

    // Special Case: Cooldown = Base * (1 - Bonus)
    finalStats.cooldown = (baseStats.cooldown || 0) * (1.0 - (normalizedBonuses.cooldown || 0));

    // --- Stage 4: Final DPS/DPM ---
    const f_fr = finalStats.fire_rate;
    const f_cc = finalStats.crit_chance;
    const f_cp = finalStats.crit_power;
    const f_oh = finalStats.overheat;
    const f_cd = finalStats.cooldown;
    
    // DPM Denominator
    const dpm_denom = (f_oh + f_cd) !== 0 ? (f_oh + f_cd) : 1.0;
    const rangeBonus = normalizedBonuses.range || 0;

    // Helper to calc DPS suite
    const calculateMode = (baseDmg: number) => {
      // Clean DPS = (BaseDmg * FireRate) / 60
      const clean_dps = ((baseDmg * f_fr) / 60.0) * (1 + rangeBonus / 2);
      
      // Crit DPS = Clean * (CritChance/100) * (1 + CritPower/100)
      // Note: Logic assumes f_cc and f_cp are raw values, potentially percentages themselves?
      // Based on Python script: f_cc/100 and f_cp/100
      const crit_dps = clean_dps * (f_cc / 100.0) * (1.0 + (f_cp / 100.0));
      
      const total_dps = clean_dps + crit_dps;
      
      // DPM = 60 / (OH + CD) * TotalDPS * OH
      const dpm = (60.0 / dpm_denom) * total_dps * f_oh;

      return { clean_dps, crit_dps, total_dps, dpm };
    };

    // Spec Ops (Uses d3 - Aliens)
    const spec_ops = calculateMode(d3);

    // General (Uses d1 - Basic/Elem)
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
    candidateChip: Stats
  ): ReplacementResult[] {
    const baseline = this.calculate(baseStats, currentChips);
    const results: ReplacementResult[] = [];

    // Check if candidate is empty (optimization)
    const isCandidateEmpty = Object.values(candidateChip).every(v => v === 0);
    if (isCandidateEmpty) return [];

    for (let i = 0; i < currentChips.length; i++) {
        // Skip empty current chips? Logic says try replacing everything.
        
        // Create copy with replacement
        const tempChips = [...currentChips];
        tempChips[i] = candidateChip;

        const newRes = this.calculate(baseStats, tempChips);

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
            }
        });
    }

    // Return all results, let UI sort them
    return results;
  }
}
