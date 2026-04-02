import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  persistConfigs,
  loadPersistedConfigs,
  upsertConfig,
  removeConfig,
  persistChips,
  loadPersistedChips,
  persistShipRank,
  loadPersistedShipRank,
  applyLegacyMigration,
  exportBackup,
  parseBackupFile
} from './configStorage';
import { SavedConfig, SavedChip } from '../types';

describe('configStorage', () => {

  beforeEach(() => {
    // Mock local storage
    const storage: Record<string, string> = {};
    const mockLocalStorage = {
      getItem: vi.fn((key: string) => storage[key] || null),
      setItem: vi.fn((key: string, value: string) => { storage[key] = value.toString(); }),
      removeItem: vi.fn((key: string) => { delete storage[key]; }),
      clear: vi.fn(() => { for (const key in storage) delete storage[key]; })
    } as any;
    
    vi.stubGlobal('localStorage', mockLocalStorage);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Configs CRUD', () => {
    it('should persist and load configs', () => {
      const configs: SavedConfig[] = [{
        name: 'test', timestamp: 0, level: 15, baseStats: {}, chips: [], candidate: {} as any
      }];
      
      persistConfigs(configs);
      const loaded = loadPersistedConfigs();
      
      expect(loaded.length).toBe(1);
      expect(loaded[0].name).toBe('test');
    });

    it('should handle invalid JSON smoothly', () => {
      localStorage.setItem('dmg_calc_configs', '{invalid json');
      const loaded = loadPersistedConfigs();
      expect(loaded).toEqual([]);
    });

    it('should upsert configs', () => {
      const initial: SavedConfig[] = [{
        name: 'test', timestamp: 0, level: 15, baseStats: {}, chips: [], candidate: {} as any
      }];
      const updatedConfig: SavedConfig = {
        name: 'test', timestamp: 1, level: 15, baseStats: { damage: 10 }, chips: [], candidate: {} as any
      };
      
      const res = upsertConfig(initial, updatedConfig);
      expect(res.length).toBe(1);
      expect(res[0].timestamp).toBe(1);
      expect(res[0].baseStats?.damage).toBe(10);
    });

    it('should remove config', () => {
      const initial: SavedConfig[] = [{
        name: 'test', timestamp: 0, level: 15, baseStats: {}, chips: [], candidate: {} as any
      }];
      
      const res = removeConfig(initial, 'test');
      expect(res.length).toBe(0);
    });
  });

  describe('Chips CRUD', () => {
    it('should persist and load chips', () => {
      const chips: SavedChip[] = [{
        id: '1', level: 15, timestamp: 0, stats: { damage: 10 }
      }];
      
      persistChips(chips);
      const loaded = loadPersistedChips();
      
      expect(loaded.length).toBe(1);
      expect(loaded[0].id).toBe('1');
    });

    it('should handle invalid JSON smoothly', () => {
      localStorage.setItem('dmg_calc_chips', 'abc');
      expect(loadPersistedChips()).toEqual([]);
    });
  });

  describe('Ship Rank', () => {
    it('should persist and load rank', () => {
      persistShipRank(12);
      expect(loadPersistedShipRank()).toBe(12);
    });

    it('should return default rank if not found', () => {
      expect(loadPersistedShipRank(15)).toBe(15);
    });
  });

  describe('applyLegacyMigration', () => {
    it('should migrate elem_damage to dmg_em and add warnings', () => {
      const legacyConfig: SavedConfig = {
        name: 'legacy',
        timestamp: 0,
        level: 10,
        baseStats: { elem_damage: 100 } as any,
        chips: [
          { damage: 10 },
          { elem_damage: 50 } as any
        ],
        candidate: {} as any
      };
      
      const result = applyLegacyMigration(legacyConfig, 'Legacy Warning text');
      
      expect(result.baseStats.dmg_em).toBe(100);
      expect((result.baseStats as any).elem_damage).toBeUndefined();
      expect(result.warnings['base_dmg_em']).toBe('Legacy Warning text');

      expect(result.chips.length).toBe(2);
      expect(result.chips[0].level).toBe(10); // inherits config level
      expect(result.chips[1].dmg_em).toBe(50);
      expect(result.warnings['chip_1_dmg_em']).toBe('Legacy Warning text');
    });
  });

  describe('exportBackup', () => {
    it('should create a download link for backup', () => {
      const mockClassList = { add: vi.fn(), remove: vi.fn() };
      const mockElement = {
        setAttribute: vi.fn(),
        appendChild: vi.fn(),
        click: vi.fn(),
        remove: vi.fn(),
        classList: mockClassList
      };
      const mockDocument = {
        createElement: vi.fn().mockReturnValue(mockElement),
        body: { appendChild: vi.fn() }
      };
      vi.stubGlobal('document', mockDocument);

      exportBackup([{ name: 'test', timestamp: 0, chips: [], baseStats: {} } as any], [], 15);

      expect(mockDocument.createElement).toHaveBeenCalledWith('a');
      expect(mockElement.setAttribute).toHaveBeenCalledWith('download', 'damage_calc_backup.json');
      expect(mockElement.click).toHaveBeenCalled();
      expect(mockElement.remove).toHaveBeenCalled();
    });
  });

  describe('parseBackupFile', () => {
    it('should parse legacy pure array backup files', () => {
      const raw = JSON.stringify([
        { name: 'test', chips: [{ damage: 10 }] }
      ]);
      const res = parseBackupFile(raw);
      expect(res.configs.length).toBe(1);
      
      // Legacy arrays extracted their non-empty chips automatically
      expect(res.chips.length).toBe(1);
      expect(res.chips[0].stats?.damage).toBe(10);
    });

    it('should parse modern object backup files', () => {
      const raw = JSON.stringify({
        configs: [{ name: 'test' }],
        chips: [{ id: '123' }],
        shipRank: 10
      });
      const res = parseBackupFile(raw);
      expect(res.configs.length).toBe(1);
      expect(res.chips.length).toBe(1);
      expect(res.shipRank).toBe(10);
    });

    it('should throw Error on invalid format', () => {
      expect(() => parseBackupFile('null')).toThrow('Invalid format');
      expect(() => parseBackupFile('123')).toThrow('Invalid format');
    });
  });
});
