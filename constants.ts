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

export const BASE_TOOLTIPS: Record<Language, Record<StatKey, string>> = {
  en: {
    damage: "Base weapon damage per shot before modifiers.",
    fire_rate: "Base rate of fire in rounds per minute (RPM).",
    range: "Base maximum effective firing range in meters.",
    crit_chance: "Base probability (%) of landing a critical hit.",
    crit_power: "Base damage multiplier applied during a critical hit.",
    overheat: "Continuous firing time (seconds) before weapon overheats.",
    cooldown: "Time (seconds) required for the weapon to cool down completely.",
    elem_damage: "",
    dmg_destroyers: "",
    dmg_aliens: "",
    dmg_elidium: ""
  },
  ru: {
    damage: "Базовый урон орудия за один выстрел.",
    fire_rate: "Базовая скорострельность (выстрелов в минуту).",
    range: "Базовая максимальная дальность стрельбы (метры).",
    crit_chance: "Базовая вероятность (%) нанесения критического урона.",
    crit_power: "Базовый множитель урона при критическом попадании.",
    overheat: "Время непрерывной стрельбы до перегрева (сек).",
    cooldown: "Время полного остывания оружия после перегрева (сек).",
    elem_damage: "",
    dmg_destroyers: "",
    dmg_aliens: "",
    dmg_elidium: ""
  }
};

export const CHIP_TOOLTIPS: Record<Language, Record<StatKey, string>> = {
  en: {
    damage: "Percentage damage modifier.",
    fire_rate: "Percentage fire rate modifier.",
    range: "Percentage range modifier.",
    crit_chance: "Percentage critical chance modifier (additive).",
    crit_power: "Percentage critical power modifier (additive).",
    overheat: "Percentage modifier to weapon overheat time. Positive increases duration.",
    cooldown: "Percentage modifier to weapon cooldown time. Negative reduces wait.",
    elem_damage: "Bonus damage (%) of the weapon's elemental type (Thermal/EM/Kinetic).",
    dmg_destroyers: "Percentage damage bonus against Destroyer class ships.",
    dmg_aliens: "Percentage damage bonus against Alien faction ships.",
    dmg_elidium: "Percentage damage bonus against Elidium faction ships/structures."
  },
  ru: {
    damage: "Модификатор урона (%).",
    fire_rate: "Модификатор скорострельности (%).",
    range: "Модификатор дальности (%).",
    crit_chance: "Модификатор шанса крита (%).",
    crit_power: "Модификатор силы крита (%).",
    overheat: "Модификатор времени перегрева (%). Положительное значение увеличивает время.",
    cooldown: "Модификатор времени остывания (%). Отрицательное значение уменьшает время.",
    elem_damage: "Бонус к урону (%) соответствующего типа (Термический/ЭМ/Кинетический).",
    dmg_destroyers: "Бонус к урону (%) по кораблям класса Эсминец.",
    dmg_aliens: "Бонус к урону (%) по кораблям фракции Чужих.",
    dmg_elidium: "Бонус к урону (%) по кораблям фракции Элидиум."
  }
};

export const UI_TEXT = {
  en: {
    appTitle: "Star Conflict chip damage calc",
    currentConfig: "Current Config",
    savedConfigs: "Saved Configurations",
    noSavedConfigs: "No saved configs.",
    baseStats: "Base Weapon Statistics",
    chipsConfig: "Chips Configuration",
    modules: "Modules",
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
    modules: "Модули",
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
    loss: "Штраф"
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