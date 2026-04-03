import { describe, it, expect } from 'vitest';
import { filterChips } from './chipSearch';
import { SavedChip, StatKey } from '../types';

describe('chipSearch', () => {
  const mockTexts = { rank: 'Rank' };
  const mockLabels: Record<StatKey, string> = {
    damage: 'Damage',
    fire_rate: 'Rate of Fire',
    crit_chance: 'Crit Chance',
    crit_power: 'Crit Damage',
    range: 'Max Range',
    overheat: 'Overheat',
    cooldown: 'Cooling',
    elem_damage: 'Elem Damage',
    dmg_em: 'EM Damage',
    dmg_thermal: 'Thermal Damage',
    dmg_kinetic: 'Kinetic Damage',
    dmg_destroyers: 'Destroyers Damage',
    dmg_aliens: 'Aliens Damage',
    dmg_elidium: 'Elidium Damage',
    dmg_total: 'Total Damage',
    number_of_cannons: 'Guns',
    level: 'Level'
  };

  const mockChips: SavedChip[] = [
    {
      id: '1',
      level: 5,
      note: 'Sniper Build',
      timestamp: 123456,
      stats: {
        range: 15.5,
        overheat: 0,
        damage: 0,
        fire_rate: 0,
      }
    },
    {
      id: '2',
      level: 3,
      note: 'DPM Focus',
      timestamp: 123456,
      stats: {
        damage: 5.5,
        fire_rate: 2.1,
        range: 0,
        overheat: 0,
      }
    }
  ];

  it('should return all chips when query is empty', () => {
    const result = filterChips(mockChips, '', mockTexts, mockLabels);
    expect(result).toHaveLength(2);
  });

  it('should filter by chip note', () => {
    const result = filterChips(mockChips, 'sniper', mockTexts, mockLabels);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('should filter by rank string', () => {
    const result = filterChips(mockChips, 'rank 3', mockTexts, mockLabels);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('should filter by stat label', () => {
    const result = filterChips(mockChips, 'max range', mockTexts, mockLabels);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('should filter by stat value', () => {
    const result = filterChips(mockChips, '15.5', mockTexts, mockLabels);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
    
    const result2 = filterChips(mockChips, '2.1', mockTexts, mockLabels);
    expect(result2).toHaveLength(1);
    expect(result2[0].id).toBe('2');
  });

  it('should be case insensitive', () => {
    const result = filterChips(mockChips, 'SNIPER', mockTexts, mockLabels);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('should ignore leading and trailing whitespace', () => {
    const result = filterChips(mockChips, '  15.5  ', mockTexts, mockLabels);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('should not match stats that have 0 value', () => {
    // Both chips have overheat: 0
    const result = filterChips(mockChips, 'overheat', mockTexts, mockLabels);
    expect(result).toHaveLength(0);
  });
});
