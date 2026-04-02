import { describe, it, expect } from 'vitest';
import { runAutoBuilder, AutoBuilderOptions } from './autoBuilder';
import { Stats } from '../types';
import { DEFAULT_CHIP_STATS } from '../constants';

const emptyChip = { ...DEFAULT_CHIP_STATS };

describe('runAutoBuilder', () => {

  const baseStats: Stats = { damage: 100, range: 1000, overheat: 10, fire_rate: 60, number_of_cannons: 1 };

  it('should find a better configuration if one exists', () => {
    const currentChips: Stats[] = [{ damage: 10 }, emptyChip, emptyChip, emptyChip, emptyChip];
    const pool: Stats[] = [{ damage: 10 }, { damage: 50 }, { fire_rate: 10 }];

    const opts: AutoBuilderOptions = {
        baseStats, 
        currentChips, 
        pool, 
        activeModules: {}, 
        selectedDamageType: 'em', 
        isBetaEnabled: false, 
        forceCrit: false, 
        optimizeFor: 'general', 
        minRange: 0, 
        minOverheat: 0
    };
    
    const result = runAutoBuilder(opts);
    
    // It should pick {damage: 50}, {damage: 10}, and {fire_rate: 10}
    expect(result.chips.some(c => c.damage === 50)).toBe(true);
    expect(result.chips.some(c => c.fire_rate === 10)).toBe(true);
  });

  it('should fallback to current chips if no better valid configuration is found', () => {
    // Current gives 1500 range (base 1000 + 50%)
    const currentChips: Stats[] = [{ range: 50 }, emptyChip, emptyChip, emptyChip, emptyChip];
    // Pool only has high damage but severely negative range
    const pool: Stats[] = [
      { damage: 100, range: -50 }, 
      { damage: 100, range: -50 }
    ];
    
    const opts: AutoBuilderOptions = {
        baseStats, 
        currentChips, 
        pool, 
        activeModules: {}, 
        selectedDamageType: 'em', 
        isBetaEnabled: false, 
        forceCrit: false, 
        optimizeFor: 'general', 
        minRange: 1400, // Constraint requires keeping high range
        minOverheat: 0
    };
    
    const result = runAutoBuilder(opts);
    
    // The pool chips violate the constraint, so it must keep the current chips
    expect(result.chips[0].range).toBe(50);
    expect(result.chips.some(c => c.damage === 100)).toBe(false);
  });

  it('should respect minRange and minOverheat constraints and find a combined solution via local search', () => {
    // We intentionally set up a scenario where ONLY picking a specific combination
    // of chips satisfies both constraints.
    const localBaseStats = { damage: 100, range: 100, overheat: 10, fire_rate: 60 };
    const currentChips = [emptyChip, emptyChip, emptyChip, emptyChip, emptyChip];
    
    // Chip A: Gives Range, hurts Overheat
    // Chip B: Gives Overheat, hurts Range
    // Chip C: Huge damage trap, hurts both heavily
    const pool = [
      { damage: 10, range: 40, overheat: -10 },
      { damage: 10, range: -10, overheat: 40 },
      { damage: 500, range: -50, overheat: -50 }
    ];
    
    // Base is range 100, overheat 10.
    // If Empty: range 100, overheat 10 (Fails both)
    // If only A: range 140, overheat ~8.88 (Fails overheat)
    // If only B: range ~88.8, overheat 14 (Fails range)
    // If A and B: range ~128.8, overheat ~12.8 (Passes both!)
    
    const opts: AutoBuilderOptions = {
        baseStats: localBaseStats, 
        currentChips, 
        pool, 
        activeModules: {}, 
        selectedDamageType: 'em', 
        isBetaEnabled: false, 
        forceCrit: false, 
        optimizeFor: 'general', 
        minRange: 125, 
        minOverheat: 12.5
    };
    
    const result = runAutoBuilder(opts);
    
    const hasA = result.chips.some(c => c.range === 40);
    const hasB = result.chips.some(c => c.overheat === 40);
    const hasC = result.chips.some(c => c.damage === 500);
    
    expect(hasA).toBe(true);
    expect(hasB).toBe(true);
    expect(hasC).toBe(false);
    expect(result.constraintWarnings.length).toBe(0); // Should resolve constraints cleanly
  });

});
