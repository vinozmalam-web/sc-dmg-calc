import { describe, it, expect } from 'vitest';
import { DamageCalculator } from './calculator';
import { Stats, ModuleState } from '../types';

describe('DamageCalculator', () => {

  describe('calculate', () => {

    it('should calculate base damage with no modifiers', () => {
      const baseStats: Stats = { damage: 100, fire_rate: 60 };
      const chips: Stats[] = [];
      const result = DamageCalculator.calculate(baseStats, chips);

      expect(result.general.total_dps).toBe(100);
      expect(result.final_stats.fire_rate).toBe(60);
    });

    it('should calculate positive damage modifier (Z value)', () => {
      const baseStats: Stats = { damage: 100, fire_rate: 60 };
      const chips: Stats[] = [{ damage: 20 }]; // +20%
      const result = DamageCalculator.calculate(baseStats, chips);

      // Z=20 -> mod=0.2. new damage = 100 * (1 + 0.2) = 120. dps = 120 * 60 / 60 = 120
      expect(result.general.total_dps).toBe(120);
    });

    it('should calculate negative damage modifier (Z value)', () => {
      const baseStats: Stats = { damage: 100, fire_rate: 60 };
      const chips: Stats[] = [{ damage: -20 }];
      const result = DamageCalculator.calculate(baseStats, chips);

      // Z=-20 -> mod = 1 - (100/(100-20)) = 1 - (100/80) = 1 - 1.25 = -0.25
      // modSum < 0 -> damage = base / (1 - modSum) = 100 / (1 - (-0.25)) = 100 / 1.25 = 80
      expect(result.general.total_dps).toBe(80);
    });

    it('should calculate crit dps correctly', () => {
      const baseStats: Stats = { damage: 100, fire_rate: 60, crit_chance: 50, crit_power: 50 };
      const chips: Stats[] = [];
      const result = DamageCalculator.calculate(baseStats, chips);

      // clean dps = 100
      // crit dps = 100 * (50/100) * (1 + 50/100) = 100 * 0.5 * 1.5 = 75
      // total dps = 175
      expect(result.general.clean_dps).toBe(100);
      expect(result.general.crit_dps).toBe(75);
      expect(result.general.total_dps).toBe(175);
    });

    it('should calculate proper overheat total DPM', () => {
      const baseStats: Stats = { damage: 100, fire_rate: 60, overheat: 5, cooldown: 5 };
      const chips: Stats[] = [];
      const result = DamageCalculator.calculate(baseStats, chips);

      // dpm_denom = overheat + cooldown = 10
      // total_dps = 100
      // dpm = (60 / 10) * 100 * 5 = 3000
      expect(result.general.dpm).toBe(3000);
    });

    it('should handle stage 1 elemental damage specific to selected damage type', () => {
      const baseStats: Stats = { damage: 100, fire_rate: 60 };
      const chips: Stats[] = [{ dmg_em: 20 }, { dmg_thermal: 30 }];

      const resEm = DamageCalculator.calculate(baseStats, chips, {}, 'em');
      expect(resEm.intermediate.d1).toBe(120); // only gets EM

      const resThermal = DamageCalculator.calculate(baseStats, chips, {}, 'thermal');
      expect(resThermal.intermediate.d1).toBe(130); // only gets Thermal
    });

    it('should calculate stage 2 and stage 3 multipliers properly', () => {
      const baseStats: Stats = { damage: 100, fire_rate: 60 };
      const chips: Stats[] = [
        { dmg_em: 20 },         // d1 = 120
        { dmg_destroyers: 10 }, // d2 = 120 * 1.1 = 132
        { dmg_aliens: 50 }      // d3 = 132 * 1.5 = 198
      ];

      const result = DamageCalculator.calculate(baseStats, chips, {}, 'em');
      expect(result.intermediate.d1).toBe(120);
      expect(result.intermediate.d2).toBe(132);
      expect(result.intermediate.d3).toBe(198);

      // general uses d1, spec_ops uses d3
      expect(result.general.clean_dps).toBe(120);
      expect(result.spec_ops.clean_dps).toBe(198);
    });

    it('should include dmg_total additively with base damage in normal mode', () => {
      const baseStats: Stats = { damage: 100, fire_rate: 60 };
      const chips: Stats[] = [{ dmg_total: 20 }]; // +20%

      // Normal mode: dmg_total is additive with stage 1 damage
      // Z=20 -> mod=0.2, d1 = 100 * (1 + 0.2) = 120
      const res = DamageCalculator.calculate(baseStats, chips, {}, 'em', false);
      expect(res.intermediate.d1).toBe(120);
      expect(res.general.total_dps).toBe(120);
    });

    it('should apply dmg_total as a multiplier to final shot damage in beta mode', () => {
      const baseStats: Stats = { damage: 100, fire_rate: 60 };
      const chips: Stats[] = [{ dmg_total: 100 }]; // +100%

      // Beta mode: dmg_total is NOT included in d1; it becomes a separate multiplier
      // totalDmgZ = [100] -> totalDmgResult = calculateFinalValue(1.0, [100]) = 1.0 * (1 + 1.0) = 2.0
      // d1 stays at 100 (no additive bonus)
      // effectiveDmg = 100 * 2.0 = 200, DPS = 200
      const resEnabled = DamageCalculator.calculate(baseStats, chips, {}, 'em', true);
      expect(resEnabled.intermediate.d1).toBe(100);
      expect(resEnabled.general.total_dps).toBe(200);
      expect(resEnabled.spec_ops.total_dps).toBe(200);
    });

    it('should apply active modules modifiers with diminishing returns for multiple count', () => {
      const baseStats: Stats = { damage: 100, fire_rate: 60 };
      const chips: Stats[] = [];
      const activeModules: Record<string, ModuleState> = {
        'mod1': {
          enabled: true,
          count: 2,
          values: { damage: 20 }
        }
      };

      const result = DamageCalculator.calculate(baseStats, chips, activeModules);

      // Count is 2 -> multiplier is 0.9. 
      // Two Z values of 20 * 0.9 = 18. Modifiers = 0.18 + 0.18 = 0.36
      // final value = 100 * (1 + 0.36) = 136
      expect(result.general.total_dps).toBe(136);
      expect(result.intermediate.d1).toBe(136);
    });

    it('should multiply fire rate by number of cannons', () => {
      const baseStats: Stats = { damage: 100, fire_rate: 60, number_of_cannons: 4 };
      const chips: Stats[] = [];
      const result = DamageCalculator.calculate(baseStats, chips);

      expect(result.final_stats.fire_rate).toBe(240); // 60 * 4 = 240
      expect(result.general.total_dps).toBe(400); // 100 * 240 / 60 = 400
    });
  });

  describe('findBestReplacement', () => {
    it('should evaluate the candidate chip in all chip positions', () => {
      const baseStats: Stats = { damage: 100, fire_rate: 60 };
      const currentChips: Stats[] = [
        { damage: 10 },
        { damage: 20 }
      ];
      const candidate: Stats = { damage: 30 };

      const results = DamageCalculator.findBestReplacement(baseStats, currentChips, candidate);

      // Should return 2 replacement suggestions
      expect(results.length).toBe(2);

      // Replacing index 0 ({damage:10} with {damage:30}) -> total mods: 30 + 20 = 50 -> 150 DPS
      // Replacing index 1 ({damage:20} with {damage:30}) -> total mods: 10 + 30 = 40 -> 140 DPS
      // baseline -> total mods: 10 + 20 = 30 -> 130 DPS

      const res0 = results.find(r => r.replaced_index === 0);
      expect(res0?.general.new_dpm).toBe(150 * 60);
      expect(res0?.general.dps_delta).toBe(150 - 130);

      const res1 = results.find(r => r.replaced_index === 1);
      expect(res1?.general.new_dpm).toBe(140 * 60);
      expect(res1?.general.dps_delta).toBe(140 - 130);
    });

    it('should return empty results if candidate only has level or non-modifier stats set', () => {
      const baseStats: Stats = { damage: 100, fire_rate: 60 };
      const currentChips: Stats[] = [{ damage: 10 }];
      const candidate1: Stats = { damage: 0 };
      const candidate2: Stats = { level: 15, damage: 0 };
      const candidate3: Stats = { level: 17, number_of_cannons: 2 };

      expect(DamageCalculator.findBestReplacement(baseStats, currentChips, candidate1).length).toBe(0);
      expect(DamageCalculator.findBestReplacement(baseStats, currentChips, candidate2).length).toBe(0);
      expect(DamageCalculator.findBestReplacement(baseStats, currentChips, candidate3).length).toBe(0);
    });
  });
});
