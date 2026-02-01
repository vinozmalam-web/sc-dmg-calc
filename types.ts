
export type StatKey = 
  | "damage"
  | "fire_rate"
  | "range"
  | "crit_chance"
  | "crit_power"
  | "overheat"
  | "cooldown"
  | "elem_damage"
  | "dmg_em"
  | "dmg_thermal"
  | "dmg_kinetic"
  | "dmg_destroyers"
  | "dmg_aliens"
  | "dmg_elidium";

export type Language = 'en' | 'ru';

export type DamageType = 'em' | 'thermal' | 'kinetic';

export interface Stats {
  [key: string]: number;
}

export interface DpsStats {
  clean_dps: number;
  crit_dps: number;
  total_dps: number;
  dpm: number;
}

export interface CalculationResult {
  spec_ops: DpsStats;
  general: DpsStats;
  final_stats: Stats;
  intermediate: {
    d1: number;
    d2: number;
    d3: number;
  };
}

export interface ReplacementResult {
  replaced_index: number;
  spec_ops: {
    dpm_delta: number;
    dps_delta: number;
    new_dpm: number;
  };
  general: {
    dpm_delta: number;
    dps_delta: number;
    new_dpm: number;
  };
}

export type ModuleType = 'fixed' | 'modifiable';
export type ModuleCategory = 'ammo' | 'modifier';

export interface ModuleDefinition {
  id: string;
  name: Record<Language, string>;
  type: ModuleType;
  category: ModuleCategory;
  defaultStats: Partial<Record<StatKey, number>>;
}

export interface ModuleState {
  enabled: boolean;
  values: Partial<Record<StatKey, number>>;
}

export interface SavedConfig {
  name: string;
  timestamp: number;
  baseStats: Stats;
  chips: Stats[];
  candidate: Stats;
  activeModules?: Record<string, ModuleState>;
  selectedDamageType?: DamageType;
}
