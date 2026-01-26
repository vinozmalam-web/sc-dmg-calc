import { ModuleDefinition } from '../types';

export const MODULES: ModuleDefinition[] = [
  {
    id: 'ammo_flat_reflector',
    name: {
      en: 'Ammo Flat Reflector',
      ru: 'Боеприпас Плоский рефлектор'
    },
    type: 'fixed',
    defaultStats: {
      range: 15
    }
  },
  {
    id: 'system_horizon',
    name: {
      en: 'System Horizon',
      ru: 'Система Горизонт'
    },
    type: 'modifiable',
    defaultStats: {
      range: 40.1,
      damage: -6.5
    }
  }
];