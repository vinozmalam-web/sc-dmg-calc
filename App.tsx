

import { useState, useEffect, useMemo } from 'react';
import { Stats, SavedConfig, StatKey, Language, ModuleState, DamageType } from './types';
import { DEFAULT_BASE_STATS, DEFAULT_CHIP_STATS, BASE_STATS_KEYS, CHIP_STATS_KEYS, UI_TEXT, LABELS, BASE_TOOLTIPS, CHIP_TOOLTIPS, DAMAGE_TYPE_TOOLTIPS } from './constants';
import { MODULES } from './data/modules';
import { DamageCalculator } from './services/calculator';
import { StatInput } from './components/StatInput';
import { ResultsPanel } from './components/ResultsPanel';
import { AnalysisPanel } from './components/AnalysisPanel';
import { ModulesPanel } from './components/ModulesPanel';
import { Save, FolderOpen, Trash2, Cpu, BarChart2, RefreshCcw, Globe, Check, Info, X, Plus, Download, Upload, Zap } from 'lucide-react';

import { GlobalAnalysis } from './components/GlobalAnalysis';
import { ChipInventory } from './components/ChipInventory';
import { AutoBuilderModal } from './components/AutoBuilderModal';
import { SavedChip } from './types';

const STORAGE_KEY = 'dmg_calc_configs';
const LANG_STORAGE_KEY = 'dmg_calc_lang';
const APP_VERSION = '0.8.1';

export default function App() {
  // --- State ---
  const [baseStats, setBaseStats] = useState<Stats>(DEFAULT_BASE_STATS);
  const [chips, setChips] = useState<Stats[]>(() => Array.from({ length: 5 }, () => ({ ...DEFAULT_CHIP_STATS })));
  const [candidate, setCandidate] = useState<Stats>({ ...DEFAULT_CHIP_STATS });
  const [activeModules, setActiveModules] = useState<Record<string, ModuleState>>({});
  const [selectedDamageType, setSelectedDamageType] = useState<DamageType>('em');
  const [activeChipTab, setActiveChipTab] = useState(0);
  const [warnings, setWarnings] = useState<Record<string, string>>({});
  const [shipRank, setShipRank] = useState(() => {
    const saved = localStorage.getItem('dmg_calc_ship_rank');
    return saved ? parseInt(saved, 10) : 15;
  });
  const [isTemporary, setIsTemporary] = useState(false);
  
  // Language State
  const [language, setLanguage] = useState<Language>('en');
  
  // Storage State
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [savedChips, setSavedChips] = useState<SavedChip[]>([]);
  const [configName, setConfigName] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isAutoBuilderOpen, setIsAutoBuilderOpen] = useState(false);
  
  // Beta State
  const [isBetaEnabled, setIsBetaEnabled] = useState(false);
  const [isBetaPopupOpen, setIsBetaPopupOpen] = useState(false);

  // UI State
  const [toast, setToast] = useState<{ message: string; subMessage?: string; type: 'success' | 'info' } | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<'editor' | 'global_analysis' | 'inventory'>('editor');
  const [candidateRank, setCandidateRank] = useState(15);

  // --- Effects ---
  useEffect(() => {
    // Load Configs
    const loaded = localStorage.getItem(STORAGE_KEY);
    if (loaded) {
      try {
        setSavedConfigs(JSON.parse(loaded));
      } catch (e) {
        console.error("Failed to load configs", e);
      }
    }
    // Load Chips
    const loadedChips = localStorage.getItem('dmg_calc_chips');
    if (loadedChips) {
      try {
        setSavedChips(JSON.parse(loadedChips));
      } catch (e) {
        console.error("Failed to load chips", e);
      }
    }
    // Load Language
    const savedLang = localStorage.getItem(LANG_STORAGE_KEY) as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'ru')) {
        setLanguage(savedLang);
    }
    // Load Beta
    const savedBeta = localStorage.getItem('dmg_calc_beta');
    if (savedBeta === 'true') {
        setIsBetaEnabled(true);
    }
  }, []);

  // Toast Auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Effect to clean up incompatible modules when damage type changes
  useEffect(() => {
    const incompatibleModules = MODULES.filter(m => 
      m.allowedDamageTypes && !m.allowedDamageTypes.includes(selectedDamageType)
    );
    
    let hasChanges = false;
    const newActiveModules = { ...activeModules };

    incompatibleModules.forEach(m => {
        if (newActiveModules[m.id]?.enabled) {
            newActiveModules[m.id] = { ...newActiveModules[m.id], enabled: false };
            hasChanges = true;
        }
    });

    if (hasChanges) {
        setActiveModules(newActiveModules);
    }
  }, [selectedDamageType]);

  // --- Calculations ---
  const result = useMemo(() => {
    return DamageCalculator.calculate(baseStats, chips, activeModules, selectedDamageType, isBetaEnabled);
  }, [baseStats, chips, activeModules, selectedDamageType, isBetaEnabled]);

  // --- Helpers ---
  const text = UI_TEXT[language];
  const labels = LABELS[language];
  const baseTooltips = BASE_TOOLTIPS[language];
  const chipTooltips = CHIP_TOOLTIPS[language];
  const damageTypeTooltips = DAMAGE_TYPE_TOOLTIPS[language];

  const showToast = (message: string, subMessage: string = '', type: 'success' | 'info' = 'success') => {
    setToast({ message, subMessage, type });
  };

  // --- Handlers ---
  const updateBaseStat = (key: StatKey, value: number) => {
    setBaseStats(prev => ({ ...prev, [key]: value }));
    // Clear warning for this specific field if it exists
    if (warnings[`base_${key}`]) {
        const newW = {...warnings};
        delete newW[`base_${key}`];
        setWarnings(newW);
    }
  };

  const updateChipStat = (chipIndex: number, key: StatKey, value: number) => {
    let finalValue = value;
    if (key === 'level') {
      finalValue = Math.max(1, Math.min(17, Math.round(value)));
    }
    setChips(prev => {
      const newChips = [...prev];
      newChips[chipIndex] = { ...newChips[chipIndex], [key]: finalValue };
      return newChips;
    });
    // Clear warning
    if (warnings[`chip_${chipIndex}_${key}`]) {
        const newW = {...warnings};
        delete newW[`chip_${chipIndex}_${key}`];
        setWarnings(newW);
    }
  };

  const updateModule = (moduleId: string, state: ModuleState) => {
    setActiveModules(prev => ({
      ...prev,
      [moduleId]: state
    }));
  };

  const updateCandidate = (key: string, value: number) => {
    setCandidate(prev => ({ ...prev, [key]: value }));
    if (warnings[`candidate_${key}`]) {
        const newW = {...warnings};
        delete newW[`candidate_${key}`];
        setWarnings(newW);
    }
  };

  const applyReplacement = (index: number) => {
    setChips(prev => {
      const newChips = [...prev];
      newChips[index] = { ...candidate, level: candidateRank };
      return newChips;
    });
    setCandidate({ ...DEFAULT_CHIP_STATS });
    
    // Check if candidate had warnings and clear them, or transfer them? 
    // Usually new candidates are fresh, but if legacy was loaded into candidate:
    const newW = {...warnings};
    // Clear candidate warnings
    Object.keys(newW).forEach(k => {
        if (k.startsWith('candidate_')) delete newW[k];
    });
    setWarnings(newW);
  };

  const toggleLanguage = () => {
      const newLang = language === 'en' ? 'ru' : 'en';
      setLanguage(newLang);
      localStorage.setItem(LANG_STORAGE_KEY, newLang);
  };

  // --- Storage Handlers ---
  const saveConfig = () => {
    if (!configName.trim()) return;
    const newConfig: SavedConfig = {
      name: configName,
      timestamp: Date.now(),
      baseStats,
      chips,
      candidate,
      activeModules,
      selectedDamageType,
      level: shipRank,
      isTemporary
    };
    
    const newConfigs = [...savedConfigs.filter(c => c.name !== configName), newConfig];
    setSavedConfigs(newConfigs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfigs));
    showToast(text.saveAlert, '', 'success');
  };

  const loadConfig = (config: SavedConfig) => {
    const newWarnings: Record<string, string> = {};
    const textWarn = text.legacyWarning;

    // Process Base Stats Legacy Conversion
    const newBaseStats = { ...config.baseStats };
    if (newBaseStats['elem_damage']) {
      if (!newBaseStats['dmg_em']) {
        newBaseStats['dmg_em'] = newBaseStats['elem_damage'];
        newWarnings['base_dmg_em'] = textWarn;
      }
      delete newBaseStats['elem_damage'];
    }

    // Process Chips Legacy Conversion
    const newChips = config.chips.map((chip, idx) => {
      const newChip = { ...chip };
      if (newChip.level === undefined) {
        newChip.level = config.level || 15;
      }
      if (newChip['elem_damage']) {
        if (!newChip['dmg_em']) {
          newChip['dmg_em'] = newChip['elem_damage'];
          newWarnings[`chip_${idx}_dmg_em`] = textWarn;
        }
        delete newChip['elem_damage'];
      }
      return newChip;
    });

    // NOTE: We deliberately DO NOT load the candidate from the config.
    // This allows the user to keep the current candidate analysis visible 
    // while switching between different saved ship builds.
    
    // Preserve current candidate warnings
    const candidateWarnings = Object.keys(warnings)
        .filter(key => key.startsWith('candidate_'))
        .reduce((obj, key) => {
            obj[key] = warnings[key];
            return obj;
        }, {} as Record<string, string>);

    setBaseStats(newBaseStats);
    setChips(newChips);
    // setCandidate(newCandidate); // Skipped to preserve current candidate
    setActiveModules(config.activeModules || {});
    // Default to 'em' if undefined (legacy configs)
    setSelectedDamageType(config.selectedDamageType || 'em');
    setConfigName(config.name);
    const newRank = config.level || 15;
    setShipRank(newRank);
    localStorage.setItem('dmg_calc_ship_rank', newRank.toString());
    setIsTemporary(config.isTemporary || false);
    
    // Merge new build warnings with preserved candidate warnings
    setWarnings({ ...candidateWarnings, ...newWarnings });
    setIsSidebarOpen(false);

    showToast(`${text.configLoaded}: ${config.name}`, text.candidatePreserved, 'info');
  };

  const deleteConfig = (name: string) => {
    if (!confirm(`${text.deleteConfirm} "${name}"?`)) return;
    const newConfigs = savedConfigs.filter(c => c.name !== name);
    setSavedConfigs(newConfigs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfigs));
    showToast(text.configDeleted, name, 'info');
  };

  const createNewConfig = () => {
    setBaseStats(DEFAULT_BASE_STATS);
    setChips(Array.from({ length: 5 }, () => ({ ...DEFAULT_CHIP_STATS })));
    setCandidate({ ...DEFAULT_CHIP_STATS });
    setActiveModules({});
    setSelectedDamageType('em');
    setConfigName("");
    setShipRank(15);
    localStorage.setItem('dmg_calc_ship_rank', '15');
    setIsTemporary(false);
    setWarnings({});
    setIsSidebarOpen(false);
    showToast(text.newConfigCreated, '', 'info');
  };

  const saveChipToInventory = (chip: Stats, rank: number) => {
    const newChip: SavedChip = {
      id: crypto.randomUUID(),
      level: rank,
      stats: { ...chip, level: rank },
      timestamp: Date.now()
    };
    const newChips = [...savedChips, newChip];
    setSavedChips(newChips);
    localStorage.setItem('dmg_calc_chips', JSON.stringify(newChips));
    showToast(text.saveAlert, '', 'success');
  };

  const exportBackup = () => {
    if (savedConfigs.length === 0 && savedChips.length === 0) {
      showToast(text.noSavedConfigs, '', 'info');
      return;
    }
    const backupData = {
      configs: savedConfigs.map(c => ({ ...c, level: c.level || 15 })),
      chips: savedChips,
      shipRank: shipRank,
      version: 2
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "damage_calc_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    showToast(text.configExported, '', 'success');
  };

  const importBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const parsed = JSON.parse(content);
          
          let parsedConfigs: any[] = [];
          let parsedChips: any[] = [];

          if (Array.isArray(parsed)) {
            parsedConfigs = parsed;
          } else if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.configs)) parsedConfigs = parsed.configs;
            if (Array.isArray(parsed.chips)) parsedChips = parsed.chips;
          } else {
            throw new Error("Invalid format");
          }

          if (parsedConfigs.length > 0) {
            setSavedConfigs(prev => {
              const existingMap = new Map(prev.map(c => [c.name, c]));
              parsedConfigs.forEach(c => {
                if (c.name) existingMap.set(c.name, c);
              });
              const mergedConfigs = Array.from(existingMap.values());
              localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedConfigs));
              return mergedConfigs;
            });
          }

          if (parsed && typeof parsed === 'object' && parsed.shipRank !== undefined) {
            setShipRank(parsed.shipRank);
            localStorage.setItem('dmg_calc_ship_rank', parsed.shipRank.toString());
          }

          setSavedChips(prev => {
            let newChipsToAdd: SavedChip[] = [];
            
            if (parsedChips.length > 0) {
              newChipsToAdd = [...parsedChips];
            } else if (parsedConfigs.length > 0 && Array.isArray(parsed)) {
              // Extract from legacy configs
              parsedConfigs.forEach((config: any) => {
                if (config.chips && Array.isArray(config.chips)) {
                  config.chips.forEach((chip: any) => {
                    const isNotEmpty = Object.values(chip).some(val => val !== 0);
                    if (isNotEmpty) {
                      newChipsToAdd.push({
                        id: crypto.randomUUID(),
                        level: chip.level || config.level || 15,
                        stats: { ...chip },
                        timestamp: Date.now(),
                        note: `Imported from ${config.name || 'backup'}`
                      });
                    }
                  });
                }
              });
            }

            if (newChipsToAdd.length > 0) {
              const uniqueNewChips = newChipsToAdd.filter(newChip => {
                return !prev.some(existingChip => {
                  if (newChip.id && existingChip.id === newChip.id) return true;
                  const keys = Object.keys(newChip.stats) as (keyof Stats)[];
                  return existingChip.level === newChip.level && keys.every(k => existingChip.stats[k] === newChip.stats[k]);
                });
              });

              if (uniqueNewChips.length > 0) {
                const mergedChips = [...prev, ...uniqueNewChips];
                localStorage.setItem('dmg_calc_chips', JSON.stringify(mergedChips));
                return mergedChips;
              }
            }
            return prev;
          });

          showToast(text.importSuccess, '', 'success');
        } catch (err) {
          showToast(text.importError, '', 'info');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
      
      {/* --- Overlays for Mobile --- */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      {isAnalysisOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsAnalysisOpen(false)}
        />
      )}

      {/* --- Sidebar (Storage) --- */}
      <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 w-80 md:w-64 bg-slate-950 border-r border-slate-800 transition-transform duration-300 fixed md:static z-50 h-full flex flex-col shrink-0 shadow-2xl md:shadow-none`}>
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <h1 className="text-lg font-bold text-blue-500 tracking-tight">{text.appTitle}</h1>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white">✕</button>
        </div>
        
        <div className="p-3 space-y-3 flex-1 overflow-y-auto">
           <button 
             onClick={toggleLanguage}
             className="w-full flex items-center justify-center gap-2 p-1.5 rounded bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800 transition-all text-xs font-medium text-slate-300"
           >
             <Globe className="w-3.5 h-3.5" />
             <span>{language === 'en' ? 'English' : 'Русский'}</span>
           </button>

           <div className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300">
             <span>{text.betaVersion}</span>
             <button 
               onClick={() => {
                 if (isBetaEnabled) {
                   setIsBetaEnabled(false);
                   localStorage.setItem('dmg_calc_beta', 'false');
                 } else {
                   setIsBetaPopupOpen(true);
                 }
               }}
               className={`w-8 h-4 rounded-full relative transition-colors ${isBetaEnabled ? 'bg-blue-500' : 'bg-slate-700'}`}
             >
               <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${isBetaEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
             </button>
           </div>

           <button 
             onClick={createNewConfig}
             className="w-full flex items-center justify-center gap-2 p-1.5 rounded bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600/30 hover:border-emerald-500/50 transition-all text-xs font-medium text-emerald-400"
           >
             <Plus className="w-4 h-4" />
             <span>{text.newConfig}</span>
           </button>

           <div className="space-y-2">
             <label className="text-xs font-semibold text-slate-500 uppercase">{text.currentConfig}</label>
             <div className="flex gap-2">
               <input 
                  type="text" 
                  value={configName} 
                  onChange={(e) => setConfigName(e.target.value)}
                  placeholder={text.configNamePlaceholder}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
               />
               <button onClick={saveConfig} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded">
                 <Save className="w-4 h-4" />
               </button>
             </div>
           </div>

           <div className="space-y-2 pt-4">
             <label className="text-xs font-semibold text-slate-500 uppercase">{text.savedConfigs}</label>
             {savedConfigs.length === 0 ? (
               <div className="text-slate-600 text-sm italic">{text.noSavedConfigs}</div>
             ) : (
               <div className="space-y-2">
                 {savedConfigs.map(config => (
                   <div key={config.name} className="group flex items-center justify-between p-3 bg-slate-900 rounded border border-slate-800 hover:border-slate-600 transition-all">
                     <button onClick={() => loadConfig(config)} className="text-sm font-medium text-slate-300 hover:text-white flex-1 text-left truncate">
                       {config.name}
                     </button>
                     <button onClick={() => deleteConfig(config.name)} className="text-slate-600 hover:text-red-400 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                 ))}
               </div>
             )}

             <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-800">
               <button 
                 onClick={importBackup}
                 className="flex items-center justify-center gap-2 p-2 rounded bg-slate-800 border border-slate-700 hover:border-slate-500 hover:bg-slate-700 transition-all text-sm font-medium text-slate-300"
               >
                 <Upload className="w-4 h-4" />
                 <span>{text.importBackup}</span>
               </button>
               <button 
                 onClick={exportBackup}
                 disabled={savedConfigs.length === 0}
                 className={`flex items-center justify-center gap-2 p-2 rounded border transition-all text-sm font-medium ${savedConfigs.length === 0 ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed' : 'bg-slate-800 border-slate-700 hover:border-slate-500 hover:bg-slate-700 text-slate-300'}`}
               >
                 <Download className="w-4 h-4" />
                 <span>{text.exportBackup}</span>
               </button>
             </div>
           </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-slate-900/50 relative">
        <div className="lg:hidden bg-slate-950 p-3 border-b border-slate-800 flex items-center justify-between shrink-0 z-10 shadow-md">
          <div className="w-10">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-slate-300 hover:text-white transition-colors">
               <FolderOpen className="w-5 h-5" />
            </button>
          </div>
          <span className="font-bold text-base tracking-tight text-slate-100 truncate mx-2">{text.appTitle}</span>
          <div className="w-10 flex justify-end">
            <button 
              onClick={() => setIsAnalysisOpen(true)} 
              className={`text-slate-300 hover:text-white transition-colors ${isAnalysisOpen ? 'text-blue-400' : ''}`}
            >
               <RefreshCcw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-3 pt-1.5">
            <button
                onClick={() => setActiveMainTab('editor')}
                className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 whitespace-nowrap ${
                    activeMainTab === 'editor'
                    ? 'border-blue-500 text-blue-400 bg-slate-900/50'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
            >
                {text.shipEditor}
            </button>
            <button
                onClick={() => setActiveMainTab('global_analysis')}
                className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 whitespace-nowrap ${
                    activeMainTab === 'global_analysis'
                    ? 'border-blue-500 text-blue-400 bg-slate-900/50'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
            >
                {text.globalAnalysis}
            </button>
            <button
                onClick={() => setActiveMainTab('inventory')}
                className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 whitespace-nowrap ${
                    activeMainTab === 'inventory'
                    ? 'border-blue-500 text-blue-400 bg-slate-900/50'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
            >
                {text.chipInventory}
            </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 md:p-3 space-y-3">
            {activeMainTab === 'editor' ? (
                <>
                    <div className="bg-slate-800/40 rounded-xl p-2 sm:p-3 border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-2">
                          <BarChart2 className="w-4 h-4 text-blue-400" />
                          <h2 className="text-sm font-bold">{text.baseStats}</h2>
                        </div>
                {/* Updated Grid for Base Stats + Damage Type Selector */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
                    
                    {/* 1. Damage Input */}
                    <StatInput 
                        key="damage" 
                        statKey="damage" 
                        label={labels["damage"]}
                        description={baseTooltips["damage"]}
                        value={baseStats["damage"] || 0} 
                        onChange={updateBaseStat} 
                        warning={warnings['base_damage']}
                    />

                    {/* 2. Damage Type Selector */}
                    <div className="flex flex-col relative">
                        <label className="text-slate-400 font-medium text-xs truncate mb-0.5">
                            {text.damageType}
                        </label>
                        <div className="bg-slate-800 border border-slate-700 rounded text-slate-100 px-2 py-1.5 h-8 flex items-center justify-center gap-3">
                             <button 
                               onClick={() => setSelectedDamageType('em')}
                               title={damageTypeTooltips.em}
                               className={`w-5 h-5 rounded-full bg-blue-500 transition-all shadow-sm ${selectedDamageType === 'em' ? 'ring-2 ring-white scale-110 opacity-100' : 'opacity-40 hover:opacity-100 hover:scale-110'}`}
                             />
                             <button 
                               onClick={() => setSelectedDamageType('thermal')}
                               title={damageTypeTooltips.thermal}
                               className={`w-5 h-5 rounded-full bg-red-500 transition-all shadow-sm ${selectedDamageType === 'thermal' ? 'ring-2 ring-white scale-110 opacity-100' : 'opacity-40 hover:opacity-100 hover:scale-110'}`}
                             />
                             <button 
                               onClick={() => setSelectedDamageType('kinetic')}
                               title={damageTypeTooltips.kinetic}
                               className={`w-5 h-5 rounded-full bg-yellow-400 transition-all shadow-sm ${selectedDamageType === 'kinetic' ? 'ring-2 ring-white scale-110 opacity-100' : 'opacity-40 hover:opacity-100 hover:scale-110'}`}
                             />
                        </div>
                    </div>

                    {/* 3. Remaining Stats */}
                    {BASE_STATS_KEYS.filter(key => key !== 'damage').map(key => (
                        <StatInput 
                          key={key} 
                          statKey={key} 
                          label={labels[key]}
                          description={baseTooltips[key]}
                          value={baseStats[key] || 0} 
                          onChange={updateBaseStat} 
                          warning={warnings[`base_${key}`]}
                          min={key === 'number_of_cannons' ? 1 : undefined}
                        />
                    ))}

                    {/* Ship Rank */}
                    <div className="flex flex-col relative">
                        <label className="text-slate-400 font-medium text-xs truncate mb-0.5" title={text.shipRank}>
                            {text.shipRank}
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="17"
                            value={shipRank}
                            onChange={(e) => {
                              const newRank = Math.max(1, Math.min(17, Number(e.target.value)));
                              setShipRank(newRank);
                              localStorage.setItem('dmg_calc_ship_rank', newRank.toString());
                            }}
                            className={`w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-sm text-slate-100 focus:border-blue-500 outline-none transition-colors h-8`}
                        />
                    </div>

                    {/* Temporary Build Toggle */}
                    <div className="flex flex-col relative justify-end h-full">
                         <label className="flex items-center gap-2 cursor-pointer group h-8">
                            <div className="relative flex items-center">
                                <input 
                                    type="checkbox" 
                                    className="sr-only" 
                                    checked={isTemporary}
                                    onChange={(e) => setIsTemporary(e.target.checked)}
                                />
                                <div className={`block w-8 h-5 rounded-full transition-colors ${isTemporary ? 'bg-blue-500' : 'bg-slate-700'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${isTemporary ? 'translate-x-3' : ''}`}></div>
                            </div>
                            <span className="text-xs font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
                                {text.temporaryBuild}
                            </span>
                        </label>
                    </div>
                </div>
            </div>

            <div className="bg-slate-800/40 rounded-xl p-2 sm:p-3 border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-orange-400" />
                    <h2 className="text-sm font-bold">{text.chipsConfig}</h2>
                 </div>
                 <button
                   onClick={() => setIsAutoBuilderOpen(true)}
                   className="flex items-center gap-2 px-2 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 hover:text-blue-300 border border-blue-500/30 rounded text-[11px] font-medium transition-colors"
                 >
                   <Zap className="w-3 h-3" />
                   {text.autoBuilder}
                 </button>
              </div>

              <div className="flex border-b border-slate-700 mb-3 overflow-x-auto pb-1 scrollbar-none">
                {[0, 1, 2, 3, 4].map(idx => (
                  <button
                    key={idx}
                    onClick={() => setActiveChipTab(idx)}
                    className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] font-medium transition-colors border-b-2 whitespace-nowrap ${
                      activeChipTab === idx 
                      ? 'border-blue-500 text-blue-400 bg-slate-800/50' 
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                    }`}
                  >
                    {text.chip} {idx + 1}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 animate-in fade-in duration-300">
                  {CHIP_STATS_KEYS.map(key => (
                    <StatInput
                      key={key}
                      statKey={key}
                      label={labels[key]}
                      description={chipTooltips[key]}
                      value={chips[activeChipTab][key] || 0}
                      onChange={(k, v) => updateChipStat(activeChipTab, k, v)}
                      warning={warnings[`chip_${activeChipTab}_${key}`]}
                      min={key === 'level' ? 1 : undefined}
                      max={key === 'level' ? 17 : undefined}
                      // Dim non-selected damage types to improve UX
                      className={
                        (key === 'dmg_em' && selectedDamageType !== 'em') ||
                        (key === 'dmg_thermal' && selectedDamageType !== 'thermal') ||
                        (key === 'dmg_kinetic' && selectedDamageType !== 'kinetic') 
                        ? 'opacity-40 grayscale' 
                        : ''
                      }
                    />
                  ))}
              </div>
            </div>

            <ModulesPanel 
              activeModules={activeModules}
              language={language}
              labels={labels}
              tooltips={chipTooltips}
              texts={text}
              selectedDamageType={selectedDamageType}
              onChange={updateModule}
            />

            <ResultsPanel result={result} labels={labels} texts={text} />
            </>
            ) : activeMainTab === 'global_analysis' ? (
                <GlobalAnalysis
                    savedConfigs={savedConfigs}
                    candidate={candidate}
                    candidateRank={candidateRank}
                    isBetaEnabled={isBetaEnabled}
                    texts={text}
                    labels={labels}
                />
            ) : (
                <ChipInventory
                    savedChips={savedChips}
                    onDeleteChip={(id) => {
                        const newChips = savedChips.filter(c => c.id !== id);
                        setSavedChips(newChips);
                        localStorage.setItem('dmg_calc_chips', JSON.stringify(newChips));
                    }}
                    onUpdateChip={(id, updatedChip) => {
                        const newChips = savedChips.map(c => c.id === id ? updatedChip : c);
                        setSavedChips(newChips);
                        localStorage.setItem('dmg_calc_chips', JSON.stringify(newChips));
                    }}
                    texts={text}
                    labels={labels}
                />
            )}
            
            <div className="w-full flex justify-center mt-8 pb-4">
                <span className="text-xs font-mono text-slate-600 select-none">v{APP_VERSION}</span>
            </div>

            <div className="h-4 lg:hidden"></div>

             {/* Toast Notification */}
            {toast && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
                <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 text-slate-200 px-3 py-2 rounded-lg shadow-2xl flex items-center gap-2 min-w-[250px]">
                  <div className={`p-1.5 rounded-full flex-shrink-0 ${toast.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {toast.type === 'success' ? <Check className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-xs">{toast.message}</div>
                    {toast.subMessage && <div className="text-[11px] text-slate-400 mt-0.5">{toast.subMessage}</div>}
                  </div>
                  <button onClick={() => setToast(null)} className="text-slate-500 hover:text-white p-1 rounded-md hover:bg-slate-700/50 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

        </div>
      </div>

       <div className={`
         fixed inset-y-0 right-0 z-50 h-full w-full sm:w-[400px] shadow-2xl transition-transform duration-300 transform
         ${isAnalysisOpen ? 'translate-x-0' : 'translate-x-full'}
         lg:relative lg:translate-x-0 lg:transform-none lg:w-auto lg:shadow-xl lg:z-20 shrink-0
       `}>
         <AnalysisPanel 
           baseStats={baseStats}
           chips={chips}
           candidate={candidate}
           candidateRank={candidateRank}
           activeModules={activeModules}
           selectedDamageType={selectedDamageType}
           isBetaEnabled={isBetaEnabled}
           labels={labels}
           texts={text}
           tooltips={chipTooltips}
           warnings={warnings}
           onCandidateChange={updateCandidate}
           onCandidateRankChange={setCandidateRank}
           onApplyReplacement={applyReplacement}
           onResetCandidate={() => setCandidate({ ...DEFAULT_CHIP_STATS })}
           onSaveToInventory={() => saveChipToInventory(candidate, candidateRank)}
           onClose={() => setIsAnalysisOpen(false)}
         />
       </div>

       {/* Beta Popup */}
       {isBetaPopupOpen && (
         <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
           <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-4">
               <h3 className="text-lg font-bold text-slate-100 mb-2">{text.betaPopupTitle}</h3>
               <p className="text-slate-400 text-xs mb-3">
                 {text.betaPopupDesc}
               </p>
               <ul className="text-slate-300 text-xs space-y-1.5 mb-4 bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50">
                 <li>{text.betaPopupFeature1}</li>
               </ul>
               <div className="flex gap-2 justify-end">
                 <button 
                   onClick={() => setIsBetaPopupOpen(false)}
                   className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                 >
                   {text.no}
                 </button>
                 <button 
                   onClick={() => {
                     setIsBetaEnabled(true);
                     localStorage.setItem('dmg_calc_beta', 'true');
                     setIsBetaPopupOpen(false);
                   }}
                   className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-lg shadow-blue-900/20"
                 >
                   {text.ok}
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

       <AutoBuilderModal
         isOpen={isAutoBuilderOpen}
         onClose={() => setIsAutoBuilderOpen(false)}
         savedChips={savedChips}
         savedConfigs={savedConfigs}
         baseStats={baseStats}
         currentChips={chips}
         activeModules={activeModules}
         selectedDamageType={selectedDamageType}
         shipRank={shipRank}
         isBetaEnabled={isBetaEnabled}
         texts={text}
         labels={labels}
         onApplyBuild={(newChips) => {
           setChips(newChips);
           showToast(text.autoBuildApplied, text.chipsUpdated, "success");
         }}
       />

    </div>
  );
}