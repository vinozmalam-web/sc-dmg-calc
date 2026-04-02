import { Stats, SavedChip } from '../types';

/**
 * Compares two chip stat objects ignoring `level` and `note` fields.
 * Returns true if chips are considered identical.
 */
export function areSameChip(
  a: Record<string, number>,
  b: Record<string, number>
): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of Array.from(keys)) {
    if (key === 'level' || key === 'note') continue;
    if ((a[key] || 0) !== (b[key] || 0)) return false;
  }
  return true;
}

/**
 * Adds a chip to the inventory if it's not already there (ignoring level/note).
 * Returns the id of the added or existing chip, and the updated chips array.
 * Caps the list at 300 entries.
 */
export function addChipToInventoryGetId(
  chip: Record<string, number>,
  rank: number,
  currentChips: SavedChip[]
): { id: string; chips: SavedChip[] } {
  const existing = currentChips.find(c => areSameChip(c.stats as Record<string, number>, chip));
  if (existing) {
    return { id: existing.id, chips: currentChips };
  }

  const newChip: SavedChip = {
    id: crypto.randomUUID(),
    level: rank,
    stats: { ...chip, level: rank } as Stats,
    timestamp: Date.now(),
  };
  const newList = [...currentChips, newChip].slice(-300);
  return { id: newChip.id, chips: newList };
}

/**
 * Checks whether any meaningful stat in the chip is non-zero.
 * Fields `level` and `note` are excluded from the check.
 */
export function isChipNonEmpty(chip: Record<string, number>): boolean {
  return Object.keys(chip).some(k => k !== 'level' && k !== 'note' && (chip[k] || 0) !== 0);
}

/**
 * Merges an array of incoming SavedChips into the existing list,
 * deduplicating by id (if present) and by stats (ignoring level/note).
 * Caps the merged list at 300.
 */
export function mergeImportedChips(
  existing: SavedChip[],
  incoming: SavedChip[]
): SavedChip[] {
  const unique = incoming.filter(newChip => {
    return !existing.some(ec => {
      if (newChip.id && ec.id === newChip.id) return true;
      return areSameChip(
        ec.stats as Record<string, number>,
        newChip.stats as Record<string, number>
      );
    });
  });

  if (unique.length === 0) return existing;
  return [...existing, ...unique].slice(-300);
}
