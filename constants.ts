import { StatKey, Language } from './types';

export const BASE_STATS_KEYS: StatKey[] = [
  "damage",
  "fire_rate",
  "range",
  "crit_chance",
  "crit_power",
  "overheat",
  "cooldown"
];

export const CHIP_STATS_KEYS: StatKey[] = [
  "damage",
  "elem_damage",
  "dmg_destroyers",
  "dmg_aliens",
  "dmg_elidium",
  "fire_rate",
  "range",
  "crit_chance",
  "crit_power",
  "overheat",
  "cooldown"
];

export const LABELS: Record<Language, Record<StatKey, string>> = {
  en: {
    damage: "Damage",
    fire_rate: "Fire Rate",
    range: "Range",
    crit_chance: "Crit Chance",
    crit_power: "Crit Power",
    overheat: "Overheat",
    cooldown: "Cooldown",
    elem_damage: "Elem. Damage",
    dmg_destroyers: "Dmg vs Destroyers",
    dmg_aliens: "Dmg vs Aliens",
    dmg_elidium: "Dmg vs Elidium"
  },
  ru: {
    damage: "Урон",
    fire_rate: "Скоростр.",
    range: "Дальность",
    crit_chance: "Шанс крита",
    crit_power: "Сила крита",
    overheat: "Перегрев",
    cooldown: "Остывание",
    elem_damage: "Элем. урон",
    dmg_destroyers: "Урон эсминцам",
    dmg_aliens: "Урон пришельцам",
    dmg_elidium: "Урон Элидиуму"
  }
};

export const UI_TEXT = {
  en: {
    appTitle: "Star Conflict chip damage calc",
    currentConfig: "Current Config",
    savedConfigs: "Saved Configurations",
    noSavedConfigs: "No saved configs.",
    baseStats: "Base Statistics",
    chipsConfig: "Chips Configuration",
    chip: "Chip",
    specOps: "Special Ops",
    general: "General",
    finalAttributes: "Final Attributes",
    analysis: "Analysis",
    candidateStats: "Candidate Chip Stats",
    recommendations: "Recommendations",
    enterCandidate: "Enter candidate stats to see replacement suggestions.",
    replaceChip: "Replace Chip",
    apply: "Apply",
    reset: "Reset",
    dpm: "DPM",
    totalDps: "Total DPS",
    cleanDps: "Clean DPS",
    critDps: "Crit DPS",
    saveAlert: "Configuration saved!",
    deleteConfirm: "Delete config",
    configNamePlaceholder: "Config Name",
    emptyRecs: "Enter candidate stats to see replacement suggestions.",
    gain: "Gain",
    loss: "Loss"
  },
  ru: {
    appTitle: "Калькулятор урона чипов Star Conflict",
    currentConfig: "Текущая конфигурация",
    savedConfigs: "Сохраненные",
    noSavedConfigs: "Нет сохраненных.",
    baseStats: "Базовые параметры оружия",
    chipsConfig: "Настройка чипов",
    chip: "Чип",
    specOps: "Спецоперация",
    general: "Обычный режим",
    finalAttributes: "Итоговые параметры",
    analysis: "Сравнение",
    candidateStats: "Параметры чипа-кандидата",
    recommendations: "Рекомендации",
    enterCandidate: "Введите параметры чипа для получения предложений по замене.",
    replaceChip: "Заменить чип",
    apply: "Применить",
    reset: "Сброс",
    dpm: "DPM",
    totalDps: "DPS",
    cleanDps: "Чистый DPS",
    critDps: "Крит DPS",
    saveAlert: "Конфигурация сохранена!",
    deleteConfirm: "Удалить конфиг",
    configNamePlaceholder: "Название конфига",
    emptyRecs: "Введите характеристики нового чипа для сравнения.",
    gain: "Прирост",
    loss: "Убыток"
  }
};

export const DEFAULT_BASE_STATS: Record<StatKey, number> = {
  damage: 0,
  fire_rate: 0,
  range: 0,
  crit_chance: 0,
  crit_power: 0,
  overheat: 0,
  cooldown: 0,
  elem_damage: 0,
  dmg_destroyers: 0,
  dmg_aliens: 0,
  dmg_elidium: 0
};

export const DEFAULT_CHIP_STATS: Record<StatKey, number> = {
  ...DEFAULT_BASE_STATS
};
