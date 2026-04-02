import { describe, it, expect } from 'vitest';
import {
  areSameChip,
  addChipToInventoryGetId,
  isChipNonEmpty,
  mergeImportedChips
} from './chipInventory';
import { SavedChip } from '../types';

describe('chipInventory', () => {

  describe('areSameChip', () => {
    it('should identify identical chips', () => {
      expect(areSameChip({ damage: 10, range: 5 }, { damage: 10, range: 5 })).toBe(true);
    });

    it('should return true when chips differ only by level and note', () => {
      expect(areSameChip(
        { damage: 10, level: 1 } as any, 
        { damage: 10, level: 15, note: 'test' } as any
      )).toBe(true);
    });

    it('should return false when core stats differ', () => {
      expect(areSameChip({ damage: 10 }, { damage: 12 })).toBe(false);
      expect(areSameChip({ damage: 10 }, { damage: 10, range: 5 })).toBe(false);
    });
  });

  describe('addChipToInventoryGetId', () => {
    it('should add a new chip to inventory', () => {
      const current: SavedChip[] = [];
      const newChip = { damage: 20 };
      const { id, chips } = addChipToInventoryGetId(newChip, 15, current);

      expect(chips.length).toBe(1);
      expect(chips[0].stats.damage).toBe(20);
      expect(chips[0].level).toBe(15);
      expect(id).toBe(chips[0].id);
    });

    it('should return existing id if chip already exists in inventory', () => {
      const current: SavedChip[] = [
        { id: '123', level: 15, timestamp: 0, stats: { damage: 20, level: 15 } }
      ];
      const newChip = { damage: 20, level: 10 };
      const { id, chips } = addChipToInventoryGetId(newChip, 10, current);

      expect(chips.length).toBe(1); // No new chip added
      expect(id).toBe('123'); // Returned existing id
    });

    it('should cap the list at 300 entries', () => {
      const current: SavedChip[] = Array.from({ length: 300 }, (_, i) => ({
        id: `id${i}`,
        level: 15,
        timestamp: 0,
        stats: { damage: i + 1, level: 15 }
      }));

      const newChip = { damage: 999 };
      const { chips } = addChipToInventoryGetId(newChip, 15, current);

      expect(chips.length).toBe(300);
      // The oldest chip (id0) should be removed, the new one should be at the end
      expect(chips[chips.length - 1].stats.damage).toBe(999);
      expect(chips[0].id).toBe('id1');
    });
  });

  describe('isChipNonEmpty', () => {
    it('should return false for purely empty chips or those with only level/note', () => {
      expect(isChipNonEmpty({})).toBe(false);
      expect(isChipNonEmpty({ damage: 0 })).toBe(false);
      expect(isChipNonEmpty({ level: 15, note: 'hi' } as any)).toBe(false);
    });

    it('should return true when there are non-zero stats', () => {
      expect(isChipNonEmpty({ damage: 0.1 })).toBe(true);
      expect(isChipNonEmpty({ range: -5 })).toBe(true);
    });
  });

  describe('mergeImportedChips', () => {
    it('should merge and deduplicate imported chips based on id and stats', () => {
      const existing: SavedChip[] = [
        { id: 'id1', level: 15, timestamp: 0, stats: { damage: 10 } },
        { id: 'id2', level: 15, timestamp: 0, stats: { range: 10 } }
      ];

      const incoming: SavedChip[] = [
        // Duplicate by ID
        { id: 'id1', level: 15, timestamp: 1, stats: { damage: 999 } },
        // Duplicate by stats
        { id: 'id3', level: 10, timestamp: 0, stats: { damage: 10 } },
        // Unique new chip
        { id: 'id4', level: 15, timestamp: 0, stats: { overheat: 5 } }
      ];

      const result = mergeImportedChips(existing, incoming);
      expect(result.length).toBe(3);
      expect(result.some(c => c.id === 'id4')).toBe(true);
    });

    it('should cap merged results at 300', () => {
      const existing: SavedChip[] = Array.from({ length: 290 }, (_, i) => ({
        id: `e_id${i}`,
        level: 15,
        timestamp: 0,
        stats: { damage: i + 1 }
      }));

      const incoming: SavedChip[] = Array.from({ length: 20 }, (_, i) => ({
        id: `i_id${i}`,
        level: 15,
        timestamp: 0,
        stats: { range: i + 1 }
      }));

      const result = mergeImportedChips(existing, incoming);
      expect(result.length).toBe(300);
      expect(result[0].id).toBe('e_id10'); 
      expect(result[299].id).toBe('i_id19');
    });

    it('should return existing array if nothing unique to add', () => {
       const existing: SavedChip[] = [
         { id: 'id1', level: 15, timestamp: 0, stats: { damage: 10 } }
       ];
       const incoming: SavedChip[] = [
         { id: 'id2', level: 10, timestamp: 0, stats: { damage: 10 } }
       ];
       const result = mergeImportedChips(existing, incoming);
       expect(result).toBe(existing);
    });
  });
});
