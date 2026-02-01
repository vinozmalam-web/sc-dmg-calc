
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Box, CheckCircle2, Circle, Disc, CircleDot } from 'lucide-react';
import { MODULES } from '../data/modules';
import { ModuleState, StatKey, Language, ModuleDefinition } from '../types';
import { StatInput } from './StatInput';

interface ModulesPanelProps {
  activeModules: Record<string, ModuleState>;
  language: Language;
  labels: Record<StatKey, string>;
  tooltips: Record<StatKey, string>;
  texts: any;
  onChange: (moduleId: string, state: ModuleState) => void;
}

export const ModulesPanel: React.FC<ModulesPanelProps> = ({
  activeModules,
  language,
  labels,
  tooltips,
  texts,
  onChange
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = (moduleId: string) => {
    const targetModule = MODULES.find(m => m.id === moduleId);
    if (!targetModule) return;

    // Logic for Ammo (Exclusive Selection)
    if (targetModule.category === 'ammo') {
        // If enabling this ammo, disable all other ammo modules
        MODULES.filter(m => m.category === 'ammo' && m.id !== moduleId).forEach(m => {
             const state = activeModules[m.id];
             if (state && state.enabled) {
                 onChange(m.id, { ...state, enabled: false });
             }
        });
    }

    const currentState = activeModules[moduleId] || { enabled: false, values: {} };
    // If enabling for the first time, load defaults
    const values = Object.keys(currentState.values).length > 0 
      ? currentState.values 
      : (targetModule.defaultStats || {});
      
    onChange(moduleId, {
      ...currentState,
      enabled: !currentState.enabled,
      values
    });
  };

  const handleStatChange = (moduleId: string, key: StatKey, value: number) => {
    const currentState = activeModules[moduleId] || { enabled: false, values: {} };
    onChange(moduleId, {
      ...currentState,
      values: {
        ...currentState.values,
        [key]: value
      }
    });
  };

  const renderModuleItem = (module: ModuleDefinition) => {
    const state = activeModules[module.id] || { enabled: false, values: {} };
    const effectiveValues = Object.keys(state.values).length > 0 ? state.values : module.defaultStats;
    const isAmmo = module.category === 'ammo';

    return (
        <div key={module.id} className={`p-4 rounded-lg border transition-all ${state.enabled ? 'bg-indigo-900/10 border-indigo-500/40 shadow-sm' : 'bg-slate-900/30 border-slate-700/50'}`}>
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
            <button 
                onClick={() => handleToggle(module.id)}
                className={`transition-colors ${state.enabled ? 'text-indigo-400' : 'text-slate-600 hover:text-slate-400'}`}
            >
                {isAmmo ? (
                    state.enabled ? <CircleDot className="w-6 h-6" /> : <Circle className="w-6 h-6" />
                ) : (
                    state.enabled ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />
                )}
            </button>
            <div>
                <h3 className={`font-bold text-sm ${state.enabled ? 'text-white' : 'text-slate-400'}`}>
                {module.name[language]}
                </h3>
                {module.type === 'fixed' && (
                <div className="text-[10px] text-slate-500 uppercase tracking-tight font-medium">
                    {texts.fixed}
                </div>
                )}
            </div>
            </div>
        </div>

        {state.enabled && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pl-9 animate-in fade-in slide-in-from-left-2">
            {Object.entries(effectiveValues).map(([key, val]) => (
                <div key={key}>
                {module.type === 'modifiable' ? (
                    <StatInput
                    statKey={key as StatKey}
                    label={labels[key as StatKey]}
                    value={val as number}
                    description={tooltips[key as StatKey]}
                    onChange={(k, v) => handleStatChange(module.id, k, v)}
                    compact
                    />
                ) : (
                    <div className="flex flex-col">
                    <span className="text-xs text-slate-500 font-medium">{labels[key as StatKey]}</span>
                    <span className="text-sm font-bold text-indigo-400">+{val}%</span>
                    </div>
                )}
                </div>
            ))}
            </div>
        )}
        </div>
    );
  };

  const ammoModules = MODULES.filter(m => m.category === 'ammo');
  const modifierModules = MODULES.filter(m => m.category === 'modifier');

  return (
    <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 sm:p-6 hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Box className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-bold">{texts.modules}</h2>
          <span className="ml-2 px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-xs rounded-full">
            {(Object.values(activeModules) as ModuleState[]).filter(m => m.enabled).length}
          </span>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>

      {isOpen && (
        <div className="p-4 sm:p-6 pt-0 space-y-6 border-t border-slate-700/50 animate-in slide-in-from-top-2 duration-200">
          
          {/* Ammo Section */}
          {ammoModules.length > 0 && (
              <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{texts.ammo}</h3>
                  <div className="space-y-3">
                    {ammoModules.map(renderModuleItem)}
                  </div>
              </div>
          )}

          {/* Modifiers Section */}
          {modifierModules.length > 0 && (
              <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{texts.shipModifiers}</h3>
                  <div className="space-y-3">
                    {modifierModules.map(renderModuleItem)}
                  </div>
              </div>
          )}

        </div>
      )}
    </div>
  );
};
