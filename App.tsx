import { useState, useEffect, useMemo } from 'react';
import { Stats, SavedConfig, StatKey, Language } from './types';
import { DEFAULT_BASE_STATS, DEFAULT_CHIP_STATS, BASE_STATS_KEYS, CHIP_STATS_KEYS, UI_TEXT, LABELS, TOOLTIPS } from './constants';
import { DamageCalculator } from './services/calculator';
import { StatInput } from './components/StatInput';
import { ResultsPanel } from './components/ResultsPanel';
import { AnalysisPanel } from './components/AnalysisPanel';
import { Save, FolderOpen, Trash2, Cpu, BarChart2, RefreshCcw, Globe } from 'lucide-react';

const STORAGE_KEY = 'dmg_calc_configs';
const LANG_STORAGE_KEY = 'dmg_calc_lang';

export default function App() {
  // --- State ---
  const [baseStats, setBaseStats] = useState<Stats>(DEFAULT_BASE_STATS);
  const [chips, setChips] = useState<Stats[]>(Array(5).fill(DEFAULT_CHIP_STATS));
  const [candidate, setCandidate] = useState<Stats>(DEFAULT_CHIP_STATS);
  const [activeChipTab, setActiveChipTab] = useState(0);
  
  // Language State
  const [language, setLanguage] = useState<Language>('en');
  
  // Storage State
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [configName, setConfigName] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);

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
    // Load Language
    const savedLang = localStorage.getItem(LANG_STORAGE_KEY) as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'ru')) {
        setLanguage(savedLang);
    }
  }, []);

  // --- Calculations ---
  const result = useMemo(() => {
    return DamageCalculator.calculate(baseStats, chips);
  }, [baseStats, chips]);

  // --- Helpers ---
  const text = UI_TEXT[language];
  const labels = LABELS[language];
  const tooltips = TOOLTIPS[language];

  // --- Handlers ---
  const updateBaseStat = (key: StatKey, value: number) => {
    setBaseStats(prev => ({ ...prev, [key]: value }));
  };

  const updateChipStat = (chipIndex: number, key: StatKey, value: number) => {
    setChips(prev => {
      const newChips = [...prev];
      newChips[chipIndex] = { ...newChips[chipIndex], [key]: value };
      return newChips;
    });
  };

  const updateCandidate = (key: string, value: number) => {
    setCandidate(prev => ({ ...prev, [key]: value }));
  };

  const applyReplacement = (index: number) => {
    setChips(prev => {
      const newChips = [...prev];
      newChips[index] = { ...candidate };
      return newChips;
    });
    setCandidate(DEFAULT_CHIP_STATS); // Reset candidate after apply
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
      candidate
    };
    
    const newConfigs = [...savedConfigs.filter(c => c.name !== configName), newConfig];
    setSavedConfigs(newConfigs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfigs));
    alert(text.saveAlert);
  };

  const loadConfig = (config: SavedConfig) => {
    setBaseStats(config.baseStats);
    setChips(config.chips);
    // Explicitly NOT loading candidate stats to allow comparison of the same candidate across different configs
    setConfigName(config.name);
    setIsSidebarOpen(false);
  };

  const deleteConfig = (name: string) => {
    if (!confirm(`${text.deleteConfirm} "${name}"?`)) return;
    const newConfigs = savedConfigs.filter(c => c.name !== name);
    setSavedConfigs(newConfigs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfigs));
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
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h1 className="text-xl font-bold text-blue-500 tracking-tight">{text.appTitle}</h1>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white">✕</button>
        </div>
        
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            {/* Language Switcher (Sidebar) */}
           <button 
             onClick={toggleLanguage}
             className="w-full flex items-center justify-center gap-2 p-2 rounded bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800 transition-all text-sm font-medium text-slate-300"
           >
             <Globe className="w-4 h-4" />
             <span>{language === 'en' ? 'English' : 'Русский'}</span>
           </button>

           {/* Save Section */}
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

           {/* Load Section */}
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
           </div>
        </div>
      </div>

      {/* --- Main Content --- */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-900/50">
        
        {/* Mobile/Tablet Header Bar */}
        <div className="lg:hidden bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between shrink-0 z-10 shadow-md">
          {/* Left: Sidebar Toggle */}
          <div className="w-10">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-slate-300 hover:text-white transition-colors">
               <FolderOpen className="w-6 h-6" />
            </button>
          </div>
          
          <span className="font-bold text-lg tracking-tight text-slate-100 truncate mx-2">{text.appTitle}</span>

          {/* Right: Analysis Toggle */}
          <div className="w-10 flex justify-end">
            <button 
              onClick={() => setIsAnalysisOpen(true)} 
              className={`text-slate-300 hover:text-white transition-colors ${isAnalysisOpen ? 'text-blue-400' : ''}`}
            >
               <RefreshCcw className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8">
            
            {/* Base Stats Section */}
            <div className="bg-slate-800/40 rounded-xl p-4 sm:p-6 border border-slate-700/50">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 className="w-5 h-5 text-blue-400" />
                  <h2 className="text-lg font-bold">{text.baseStats}</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
                    {BASE_STATS_KEYS.map(key => (
                      <StatInput 
                        key={key} 
                        statKey={key} 
                        label={labels[key]}
                        description={tooltips[key]}
                        value={baseStats[key] || 0} 
                        onChange={updateBaseStat} 
                      />
                    ))}
                </div>
            </div>

            {/* Chips Section */}
            <div className="bg-slate-800/40 rounded-xl p-4 sm:p-6 border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-orange-400" />
                    <h2 className="text-lg font-bold">{text.chipsConfig}</h2>
                 </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-700 mb-6 overflow-x-auto pb-1 scrollbar-none">
                {[0, 1, 2, 3, 4].map(idx => (
                  <button
                    key={idx}
                    onClick={() => setActiveChipTab(idx)}
                    className={`px-4 sm:px-6 py-2 sm:py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                      activeChipTab === idx 
                      ? 'border-blue-500 text-blue-400 bg-slate-800/50' 
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                    }`}
                  >
                    {text.chip} {idx + 1}
                  </button>
                ))}
              </div>

              {/* Active Chip Inputs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 animate-in fade-in duration-300">
                  {CHIP_STATS_KEYS.map(key => (
                    <StatInput
                      key={key}
                      statKey={key}
                      label={labels[key]}
                      description={tooltips[key]}
                      value={chips[activeChipTab][key] || 0}
                      onChange={(k, v) => updateChipStat(activeChipTab, k, v)}
                    />
                  ))}
              </div>
            </div>

            {/* Results Display */}
            <ResultsPanel result={result} labels={labels} texts={text} />
            
            {/* Spacer for bottom scrolling on mobile */}
            <div className="h-4 lg:hidden"></div>
        </div>
      </div>

      {/* --- Right Panel (Analysis) --- */}
       <div className={`
         fixed inset-y-0 right-0 z-50 h-full w-full sm:w-[400px] shadow-2xl transition-transform duration-300 transform
         ${isAnalysisOpen ? 'translate-x-0' : 'translate-x-full'}
         lg:relative lg:translate-x-0 lg:transform-none lg:w-auto lg:shadow-xl lg:z-20 shrink-0
       `}>
         <AnalysisPanel 
           baseStats={baseStats}
           chips={chips}
           candidate={candidate}
           labels={labels}
           texts={text}
           tooltips={tooltips}
           onCandidateChange={updateCandidate}
           onApplyReplacement={applyReplacement}
           onResetCandidate={() => setCandidate(DEFAULT_CHIP_STATS)}
           onClose={() => setIsAnalysisOpen(false)}
         />
       </div>

    </div>
  );
}