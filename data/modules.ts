
import { ModuleDefinition } from '../types';

export const MODULES: ModuleDefinition[] = [
  {
    id: 'ammo_flat_reflector',
    name: {
      en: 'Ammo Flat Reflector',
      ru: 'Боеприпас Плоский рефлектор'
    },
    type: 'fixed',
    category: 'ammo',
    defaultStats: {
      range: 15
    }
  },
  {
    id: 'xenon_lamp',
    name: {
      en: 'Ammo Lamp/Shells/Deflector',
      ru: 'Боеприпас Лампа/Снаряды/Дефлектор'
    },
    type: 'fixed',
    category: 'ammo',
    defaultStats: {
      damage: 4.2
    }
  },
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
