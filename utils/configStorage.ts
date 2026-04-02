import { Stats, SavedConfig, SavedChip } from '../types';

const STORAGE_KEY = 'dmg_calc_configs';
const CHIPS_STORAGE_KEY = 'dmg_calc_chips';
const SHIP_RANK_KEY = 'dmg_calc_ship_rank';

// ---------------------------------------------------------------------------
// Config CRUD
// ---------------------------------------------------------------------------

export function persistConfigs(configs: SavedConfig[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

export function loadPersistedConfigs(): SavedConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function upsertConfig(
  configs: SavedConfig[],
  newConfig: SavedConfig
): SavedConfig[] {
  const updated = [...configs.filter(c => c.name !== newConfig.name), newConfig];
  persistConfigs(updated);
  return updated;
}

export function removeConfig(configs: SavedConfig[], name: string): SavedConfig[] {
  const updated = configs.filter(c => c.name !== name);
  persistConfigs(updated);
  return updated;
}

// ---------------------------------------------------------------------------
// Chip inventory persistence
// ---------------------------------------------------------------------------

export function persistChips(chips: SavedChip[]): void {
  localStorage.setItem(CHIPS_STORAGE_KEY, JSON.stringify(chips));
}

export function loadPersistedChips(): SavedChip[] {
  try {
    const raw = localStorage.getItem(CHIPS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function persistShipRank(rank: number): void {
  localStorage.setItem(SHIP_RANK_KEY, rank.toString());
}

export function loadPersistedShipRank(defaultRank = 15): number {
  const raw = localStorage.getItem(SHIP_RANK_KEY);
  return raw ? parseInt(raw, 10) : defaultRank;
}

// ---------------------------------------------------------------------------
// Legacy migration
// ---------------------------------------------------------------------------

interface MigrationResult {
  baseStats: Stats;
  chips: Stats[];
  warnings: Record<string, string>;
}

export function applyLegacyMigration(
  config: SavedConfig,
  legacyWarningText: string
): MigrationResult {
  const warnings: Record<string, string> = {};

  // Base stats
  const newBaseStats = { ...config.baseStats } as any;
  if (newBaseStats['elem_damage']) {
    if (!newBaseStats['dmg_em']) {
      newBaseStats['dmg_em'] = newBaseStats['elem_damage'];
      warnings['base_dmg_em'] = legacyWarningText;
    }
    delete newBaseStats['elem_damage'];
  }

  // Chips
  const newChips = config.chips.map((chip, idx) => {
    const newChip = { ...chip } as any;
    if (newChip.level === undefined) {
      newChip.level = config.level || 15;
    }
    if (newChip['elem_damage']) {
      if (!newChip['dmg_em']) {
        newChip['dmg_em'] = newChip['elem_damage'];
        warnings[`chip_${idx}_dmg_em`] = legacyWarningText;
      }
      delete newChip['elem_damage'];
    }
    return newChip as Stats;
  });

  return { baseStats: newBaseStats as Stats, chips: newChips, warnings };
}

// ---------------------------------------------------------------------------
// Export / Import backup
// ---------------------------------------------------------------------------

export function exportBackup(
  configs: SavedConfig[],
  chips: SavedChip[],
  shipRank: number
): void {
  const backupData = {
    configs: configs.map(c => ({ ...c, level: c.level || 15 })),
    chips,
    shipRank,
    version: 2,
  };
  const dataStr =
    'data:text/json;charset=utf-8,' +
    encodeURIComponent(JSON.stringify(backupData, null, 2));
  const a = document.createElement('a');
  a.setAttribute('href', dataStr);
  a.setAttribute('download', 'damage_calc_backup.json');
  document.body.appendChild(a);
  a.click();
  a.remove();
}

interface ImportResult {
  configs: SavedConfig[];
  chips: SavedChip[];
  shipRank?: number;
}

export function parseBackupFile(raw: string): ImportResult {
  const parsed = JSON.parse(raw);

  let parsedConfigs: SavedConfig[] = [];
  let parsedChips: SavedChip[] = [];
  let shipRank: number | undefined;

  if (Array.isArray(parsed)) {
    parsedConfigs = parsed;
  } else if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.configs)) parsedConfigs = parsed.configs;
    if (Array.isArray(parsed.chips)) parsedChips = parsed.chips;
    if (parsed.shipRank !== undefined) shipRank = parsed.shipRank;
  } else {
    throw new Error('Invalid format');
  }

  // Legacy: extract chips from old-format configs
  if (parsedChips.length === 0 && Array.isArray(parsed)) {
    parsedConfigs.forEach((config: any) => {
      if (config.chips && Array.isArray(config.chips)) {
        config.chips.forEach((chip: any) => {
          const isNotEmpty = Object.values(chip).some(val => val !== 0);
          if (isNotEmpty) {
            parsedChips.push({
              id: crypto.randomUUID(),
              level: chip.level || config.level || 15,
              stats: { ...chip },
              timestamp: Date.now(),
              note: `Imported from ${config.name || 'backup'}`,
            });
          }
        });
      }
    });
  }

  return { configs: parsedConfigs, chips: parsedChips, shipRank };
}
