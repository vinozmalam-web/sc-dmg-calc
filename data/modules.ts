
import { ModuleDefinition } from '../types';

export const MODULES: ModuleDefinition[] = [
  // --- EM Munitions ---
  {
    id: 'ammo_em_double_deflector',
    name: {
      en: 'Double Deflector',
      ru: 'Двойной дефлектор'
    },
    type: 'fixed',
    category: 'ammo',
    allowedDamageTypes: ['em'],
    defaultStats: {
      damage: 4.2
    }
  },
  {
    id: 'ammo_em_supernova_deflector',
    name: {
      en: '\'Supernova\' Deflector',
      ru: 'Дефлектор «Сверхновая»'
    },
    type: 'fixed',
    category: 'ammo',
    allowedDamageTypes: ['em'],
    defaultStats: {
      damage: 20,
      range: -30 // Projectile speed mapped to Range
    }
  },
  {
    id: 'ammo_em_double_deflector_mk4',
    name: {
      en: 'Double Deflector Mk.4',
      ru: 'Двойной дефлектор Mk.4'
    },
    type: 'fixed',
    category: 'ammo',
    allowedDamageTypes: ['em'],
    defaultStats: {
      damage: 7.4
    }
  },
  {
    id: 'ammo_em_supercooled_charges_mk4',
    name: {
      en: 'Supercooled Charges Mk.4',
      ru: 'Переохлажденные заряды Mk.4'
    },
    type: 'fixed',
    category: 'ammo',
    allowedDamageTypes: ['em'],
    defaultStats: {
      overheat: 50 // Heat rate reduction mapped to Overheat duration
    }
  },
  {
    id: 'ammo_em_resonating_charges_mk4',
    name: {
      en: 'Resonating charges Mk.4',
      ru: 'Резонирующие заряды Mk.4'
    },
    type: 'fixed',
    category: 'ammo',
    allowedDamageTypes: ['em'],
    defaultStats: {
      dmg_aliens: 100,
      damage: 3
    }
  },
  {
    id: 'ammo_em_boosted_charges_mk4',
    name: {
      en: 'Boosted charges Mk.4',
      ru: 'Усиленные заряды Mk.4'
    },
    type: 'fixed',
    category: 'ammo',
    allowedDamageTypes: ['em'],
    defaultStats: {
      dmg_destroyers: 30,
      damage: 5
    }
  },
  {
    id: 'ammo_em_dissonant_munitions_mk4',
    name: {
      en: 'Dissonant munitions Mk.4',
      ru: 'Диссонирующие заряды Mk.4'
    },
    type: 'fixed',
    category: 'ammo',
    allowedDamageTypes: ['em'],
    defaultStats: {
      dmg_aliens: 5000,
      damage: 5
    }
  },

  // --- Thermal Munitions ---
  {
    id: 'ammo_thermal_xenon_lamp',
    name: {
      en: 'Xenon Lamp',
      ru: 'Ксеноновая лампа'
    },
    type: 'fixed',
    category: 'ammo',
    allowedDamageTypes: ['thermal'],
    defaultStats: {
      damage: 4.2
    }
  },
  {
    id: 'ammo_thermal_hf_oscillator',
    name: {
      en: 'High-Frequency Oscillator',
      ru: 'Высокочастотный осциллятор'
    },
    type: 'fixed',
    category: 'ammo',
    allowedDamageTypes: ['thermal'],
    defaultStats: {
      overheat: 35
    }
  },
  {
    id: 'ammo_thermal_curved_reflector',
    name: {
      en: 'Curved Reflector',
      ru: 'Дуговой рефлектор'
    },
    type: 'fixed',
    category: 'ammo',
    allowedDamageTypes: ['thermal'],
    defaultStats: {
      damage: 25,
      range: -40
    }
  },
  {
    id: 'ammo_thermal_flat_reflector',
    name: {
      en: 'Flat Reflector',
      ru: 'Плоский рефлектор'
    },
    type: 'fixed',
    category: 'ammo',
    allowedDamageTypes: ['thermal'],
    defaultStats: {
      range: 15
    }
  },
  {
    id: 'ammo_thermal_hf_oscillator_premium',
    name: {
      en: 'High-Frequency Oscillator (premium)',
      ru: 'Высокочастотный осциллятор (премиум)'
    },
    type: 'fixed',
    category: 'ammo',
    allowedDamageTypes: ['thermal'],
    defaultStats: {
      overheat: 25.9
    }
  },
  {
    id: 'ammo_thermal_xenon_lamp_mk4',
    name: {
      en: 'Xenon Lamp Mk.4',
      ru: 'Ксеноновая лампа Mk.4'
    },
    type: 'fixed',
    category: 'ammo',
    allowedDamageTypes: ['thermal'],
    defaultStats: {
      damage: 7.4
    }
  },
  {
    id: 'ammo_thermal_focusing_lens_mk4',
    name: {
      en: 'Focusing Lens Mk.4',
      ru: 'Фокусирующая линза Mk.4'
    },
    type: 'fixed',
    category: 'ammo',
    allowedDamageTypes: ['thermal'],
    defaultStats: {
      crit_chance: 12
    }
  },
  {
    id: 'ammo_thermal_resonating_crystal_mk4',
    name: {
      en: 'Resonating crystal Mk.4',
      ru: 'Резонирующий кристалл Mk.4'
    },
    type: 'fixed',
    category: 'ammo',
    allowedDamageTypes: ['thermal'],
    defaultStats: {
      dmg_aliens: 100,
      damage: 3
    }
  },
  {
    id: 'ammo_thermal_lens_system_mk4',
    name: {
      en: 'Lens system Mk.4',
      ru: 'Система линз Mk.4'
    },
    type: 'fixed',
    category: 'ammo',
    allowedDamageTypes: ['thermal'],
    defaultStats: {
      dmg_destroyers: 30,
      damage: 5
    }
  },
  {
    id: 'ammo_thermal_dissonant_crystal_mk4',
    name: {
      en: 'Dissonant crystal Mk.4',
      ru: 'Диссонирующий кристалл Mk.4'
    },
    type: 'fixed',
    category: 'ammo',
    allowedDamageTypes: ['thermal'],
    defaultStats: {
      dmg_aliens: 5000,
      damage: 5
    }
  },

  // --- Kinetic Munitions ---
  {
    id: 'ammo_kinetic_explosive_shells',
    name: {
      en: 'Explosive Shells',
      ru: 'Разрывные заряды'
    },
    type: 'fixed',
    category: 'ammo',
    allowedDamageTypes: ['kinetic'],
    defaultStats: {
      damage: 4.2
    }
  },
  {
    id: 'ammo_kinetic_shaped_charge_shells',
    name: {
      en: 'Shaped Charge Shells',
      ru: 'Кумулятивные снаряды'
    },
    type: 'fixed',
    category: 'ammo',
    allowedDamageTypes: ['kinetic'],
    defaultStats: {
      crit_chance: 9
    }
  },
  {
    id: 'ammo_kinetic_uranium_shells',
    name: {
      en: 'Uranium Shells',
      ru: 'Урановые заряды'
    },
    type: 'fixed',
    category: 'ammo',
    allowedDamageTypes: ['kinetic'],
    defaultStats: {
      range: 35, // Projectile speed mapped to Range
      damage: -10
    }
  },
  {
    id: 'ammo_kinetic_vanadium_shells',
    name: {
      en: 'Vanadium Shells',
      ru: 'Ванадиевые заряды'
    },
    type: 'fixed',
    category: 'ammo',
    allowedDamageTypes: ['kinetic'],
    defaultStats: {
      fire_rate: 14
    }
  },
  {
    id: 'ammo_kinetic_explosive_shells_mk4',
    name: {
      en: 'Explosive Shells Mk.4',
      ru: 'Разрывные заряды Mk.4'
    },
    type: 'fixed',
    category: 'ammo',
    allowedDamageTypes: ['kinetic'],
    defaultStats: {
      damage: 7.4
    }
  },
  {
    id: 'ammo_kinetic_resonating_slugs_mk4',
    name: {
      en: 'Resonating slugs Mk.4',
      ru: 'Резонирующие снаряды Mk.4'
    },
    type: 'fixed',
    category: 'ammo',
    allowedDamageTypes: ['kinetic'],
    defaultStats: {
      dmg_aliens: 100,
      damage: 3
    }
  },
  {
    id: 'ammo_kinetic_piercing_charges_mk4',
    name: {
      en: 'Piercing charges Mk.4',
      ru: 'Бронебойные снаряды Mk.4'
    },
    type: 'fixed',
    category: 'ammo',
    allowedDamageTypes: ['kinetic'],
    defaultStats: {
      dmg_destroyers: 30,
      damage: 5
    }
  },
  {
    id: 'ammo_kinetic_dissonant_charges_mk4',
    name: {
      en: 'Dissonant charges Mk.4',
      ru: 'Диссонирующие снаряды Mk.4'
    },
    type: 'fixed',
    category: 'ammo',
    allowedDamageTypes: ['kinetic'],
    defaultStats: {
      dmg_aliens: 5000,
      damage: 5
    }
  },
  
  // --- Modifiers ---
  {
    id: 'system_horizon',
    name: {
      en: 'System Horizon',
      ru: 'Система Горизонт'
    },
    type: 'modifiable',
    category: 'modifier',
    defaultStats: {
      range: 40.1,
      damage: -6.5
    }
  }
];
