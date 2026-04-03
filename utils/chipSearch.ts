import { SavedChip, StatKey } from '../types';
import { CHIP_STATS_KEYS } from '../constants';

export function filterChips(
  savedChips: SavedChip[],
  searchQuery: string,
  texts: { rank: string; [key: string]: any },
  labels: Record<StatKey, string>
): SavedChip[] {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return savedChips;
  return savedChips.filter(chip => {
    if (chip.note?.toLowerCase().includes(q)) return true;
    if (`${texts.rank} ${chip.level}`.toLowerCase().includes(q)) return true;
    for (const key of CHIP_STATS_KEYS) {
      const val = chip.stats[key];
      if (val) {
        if (labels[key].toLowerCase().includes(q)) return true;
        if (val.toString().toLowerCase().includes(q)) return true;
      }
    }
    return false;
  });
}
