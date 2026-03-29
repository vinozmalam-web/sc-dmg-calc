
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, Circle, CircleDot, Crosshair, Layers, Cpu } from 'lucide-react';
import { MODULES } from '../data/modules';
import { ModuleState, StatKey, Language, ModuleDefinition, DamageType } from '../types';
import { StatInput } from './StatInput';

interface ModulesPanelProps {
  activeModules: Record<string, ModuleState>;
  language: Language;
  labels: Record<StatKey, string>;
  tooltips: Record<StatKey, string>;
  texts: any;
  selectedDamageType: DamageType;
  onChange: (moduleId: string, state: ModuleState) => void;
}

export const ModulesPanel: React.FC<ModulesPanelProps> = ({
  activeModules,
  language,
  labels,
  tooltips,
  texts,
  selectedDamageType,
  onChange
}) => {
  const [isAmmoOpen, setIsAmmoOpen] = useState(false);
  const [isModifiersOpen, setIsModifiersOpen] = useState(false);
  const [isImplantsOpen, setIsImplantsOpen] = useState(false);

  // Filter modules based on damage type compatibility
  const visibleModules = MODULES.filter(m => 
    !m.allowedDamageTypes || m.allowedDamageTypes.includes(selectedDamageType)
  );

  const handleToggle = (moduleId: string) => {
    const targetModule = MODULES.find(m => m.id === moduleId);
    if (!targetModule) return;

    // Logic for Ammo (Exclusive Selection)
    if (targetModule.category === 'ammo') {
        // If enabling this ammo, disable all other ammo modules
        visibleModules.filter(m => m.category === 'ammo' && m.id !== moduleId).forEach(m => {
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

  const handleImplantSelect = (rank: number, moduleId: string) => {
    // Disable all implants of this rank
    const implantsOfRank = visibleModules.filter(m => m.category === 'implant' && m.rank === rank);
    implantsOfRank.forEach(m => {
      const state = activeModules[m.id];
      if (state && state.enabled && m.id !== moduleId) {
        onChange(m.id, { ...state, enabled: false });
      }
    });

    if (moduleId) {
      const targetModule = MODULES.find(m => m.id === moduleId);
      if (targetModule) {
        const currentState = activeModules[moduleId] || { enabled: false, values: {} };
        const values = Object.keys(currentState.values).length > 0 
          ? currentState.values 
          : (targetModule.defaultStats || {});
        onChange(moduleId, { ...currentState, enabled: true, values });
      }
    }
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
        <div key={module.id} className={`p-3 rounded-lg border transition-all ${state.enabled ? 'bg-indigo-900/10 border-indigo-500/40 shadow-sm' : 'bg-slate-900/30 border-slate-700/50'}`}>
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
            <button 
                onClick={() => handleToggle(module.id)}
                className={`transition-colors ${state.enabled ? 'text-indigo-400' : 'text-slate-600 hover:text-slate-400'}`}
            >
                {isAmmo ? (
                    state.enabled ? <CircleDot className="w-5 h-5" /> : <Circle className="w-5 h-5" />
                ) : (
                    state.enabled ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />
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
            {state.enabled && module.maxStack && module.maxStack > 1 && (
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{texts.count}:</span>
                    <select
                        className="bg-slate-800 border border-slate-600 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                        value={state.count || 1}
                        onChange={(e) => {
                            const newCount = parseInt(e.target.value, 10);
                            onChange(module.id, { ...state, count: newCount });
                        }}
                    >
                        {Array.from({ length: module.maxStack }, (_, i) => i + 1).map(num => (
                            <option key={num} value={num}>{num}</option>
                        ))}
                    </select>
                </div>
            )}
        </div>

        {state.enabled && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pl-7 animate-in fade-in slide-in-from-left-2">
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
                    <span className="text-[11px] text-slate-500 font-medium">{labels[key as StatKey]}</span>
                    <span className="text-xs font-bold text-indigo-400">+{val}%</span>
                    </div>
                )}
                </div>
            ))}
            </div>
        )}
        </div>
    );
  };

  const ammoModules = visibleModules.filter(m => m.category === 'ammo');
  const modifierModules = visibleModules.filter(m => m.category === 'modifier');
  const implantModules = visibleModules.filter(m => m.category === 'implant');

  // Group implants by rank
  const implantsByRank = implantModules.reduce((acc, module) => {
    const rank = module.rank || 0;
    if (!acc[rank]) acc[rank] = [];
    acc[rank].push(module);
    return acc;
  }, {} as Record<number, ModuleDefinition[]>);

  const sortedRanks = Object.keys(implantsByRank).map(Number).sort((a, b) => a - b);

  const getImplantDisplayName = (m: ModuleDefinition) => {
    const code = m.id.replace('implant_', '').replace('_', '-');
    const bonuses = Object.entries(m.defaultStats).map(([key, val]) => {
      const sign = (val as number) > 0 ? '+' : '';
      return `${sign}${val}% ${labels[key as StatKey]}`;
    }).join(', ');
    return `${code} (${bonuses})`;
  };

  return (
    <div className="space-y-4">
      {/* Ammo Panel */}
      <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden">
        <button 
          onClick={() => setIsAmmoOpen(!isAmmoOpen)}
          className="w-full flex items-center justify-between p-2.5 sm:p-3 hover:bg-slate-700/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold">{texts.ammo}</h2>
            <span className="ml-2 px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] rounded-full">
              {ammoModules.filter(m => activeModules[m.id]?.enabled).length}
            </span>
          </div>
          {isAmmoOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {isAmmoOpen && (
          <div className="p-2.5 sm:p-3 pt-0 space-y-2 border-t border-slate-700/50 animate-in slide-in-from-top-2 duration-200">
            {ammoModules.length > 0 ? (
              <div className="space-y-2">
                {ammoModules.map(renderModuleItem)}
              </div>
            ) : (
              <div className="text-slate-500 text-center italic text-sm py-3">
                {texts.noAmmo}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modifiers Panel */}
      <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden">
        <button 
          onClick={() => setIsModifiersOpen(!isModifiersOpen)}
          className="w-full flex items-center justify-between p-2.5 sm:p-3 hover:bg-slate-700/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold">{texts.shipModifiers}</h2>
            <span className="ml-2 px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] rounded-full">
              {modifierModules.filter(m => activeModules[m.id]?.enabled).length}
            </span>
          </div>
          {isModifiersOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {isModifiersOpen && (
          <div className="p-2.5 sm:p-3 pt-0 space-y-2 border-t border-slate-700/50 animate-in slide-in-from-top-2 duration-200">
            {modifierModules.length > 0 ? (
              <div className="space-y-2">
                {modifierModules.map(renderModuleItem)}
              </div>
            ) : (
              <div className="text-slate-500 text-center italic text-sm py-3">
                {texts.noModules}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Implants Panel */}
      <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden">
        <button 
          onClick={() => setIsImplantsOpen(!isImplantsOpen)}
          className="w-full flex items-center justify-between p-2.5 sm:p-3 hover:bg-slate-700/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold">{texts.implants}</h2>
            <span className="ml-2 px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] rounded-full">
              {implantModules.filter(m => activeModules[m.id]?.enabled).length}
            </span>
          </div>
          {isImplantsOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {isImplantsOpen && (
          <div className="p-2.5 sm:p-3 pt-0 space-y-3 border-t border-slate-700/50 animate-in slide-in-from-top-2 duration-200">
            {sortedRanks.length > 0 ? (
              <div className="space-y-3">
                {sortedRanks.map(rank => {
                  const implants = implantsByRank[rank];
                  const activeImplant = implants.find(m => activeModules[m.id]?.enabled);
                  
                  return (
                    <div key={rank} className="p-3 rounded-lg border bg-slate-900/30 border-slate-700/50">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                        <span className="text-sm font-bold text-slate-300 min-w-[80px]">
                          {texts.rank} {rank}
                        </span>
                        <select
                          className="flex-1 bg-slate-800 border border-slate-600 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                          value={activeImplant ? activeImplant.id : ""}
                          onChange={(e) => handleImplantSelect(rank, e.target.value)}
                        >
                          <option value="">--</option>
                          {implants.map(m => (
                            <option key={m.id} value={m.id}>
                              {getImplantDisplayName(m)}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {activeImplant && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pl-0 sm:pl-[88px] animate-in fade-in slide-in-from-left-2">
                          {Object.entries(activeImplant.defaultStats).map(([key, val]) => (
                            <div key={key} className="flex flex-col">
                              <span className="text-[11px] text-slate-500 font-medium">{labels[key as StatKey]}</span>
                              <span className="text-xs font-bold text-indigo-400">+{val}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-slate-500 text-center italic text-sm py-3">
                {texts.noImplants}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
