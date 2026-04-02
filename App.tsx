import { useState, useEffect, useMemo } from 'react';
import { Stats, SavedConfig, StatKey, Language, ModuleState, DamageType } from './types';
import { DEFAULT_BASE_STATS, DEFAULT_CHIP_STATS, UI_TEXT, LABELS, BASE_TOOLTIPS, CHIP_TOOLTIPS, DAMAGE_TYPE_TOOLTIPS } from './constants';
import { MODULES } from './data/modules';
import { DamageCalculator } from './services/calculator';

// Utility helpers
import {
  addChipToInventoryGetId,
  areSameChip,
  isChipNonEmpty,
  mergeImportedChips,
} from './utils/chipInventory';
import {
  persistConfigs,
  persistChips,
  persistShipRank,
  loadPersistedConfigs,
  loadPersistedChips,
  loadPersistedShipRank,
  upsertConfig,
  removeConfig,
  applyLegacyMigration,
  exportBackup,
  parseBackupFile,
} from './utils/configStorage';

// Components

import { ResultsPanel } from './components/ResultsPanel';
import { AnalysisPanel } from './components/AnalysisPanel';
import { ModulesPanel } from './components/ModulesPanel';
import { GlobalAnalysis } from './components/GlobalAnalysis';
import { ChipInventory } from './components/ChipInventory';
import { AutoBuilderModal } from './components/AutoBuilderModal';
import { ChipSlotSwitcherModal } from './components/ChipSlotSwitcherModal';
import { Sidebar } from './components/Sidebar';
import { BaseStatsSection } from './components/BaseStatsSection';
import { ChipsSection } from './components/ChipsSection';

import { SavedChip } from './types';
import { FolderOpen, RefreshCcw, Check, Info, X } from 'lucide-react';

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
  const [shipRank, setShipRank] = useState(() => loadPersistedShipRank(15));
  const [isTemporary, setIsTemporary] = useState(false);

  // Language
  const [language, setLanguage] = useState<Language>('en');

  // Storage
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [savedChips, setSavedChips] = useState<SavedChip[]>([]);
  const [configName, setConfigName] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isAutoBuilderOpen, setIsAutoBuilderOpen] = useState(false);
  const [changeChipSlotIdx, setChangeChipSlotIdx] = useState<number | null>(null);

  // Chip links: maps slot index (0–4) to a SavedChip id or null
  const [chipLinks, setChipLinks] = useState<(string | null)[]>(() => Array(5).fill(null));

  // Beta
  const [isBetaEnabled, setIsBetaEnabled] = useState(false);
  const [isBetaPopupOpen, setIsBetaPopupOpen] = useState(false);
  const [forceCrit, setForceCrit] = useState(false);

  // UI
  const [toast, setToast] = useState<{ message: string; subMessage?: string; type: 'success' | 'info' } | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<'editor' | 'global_analysis' | 'inventory'>('editor');
  const [candidateRank, setCandidateRank] = useState(15);

  // --- Effects ---
  useEffect(() => {
    setSavedConfigs(loadPersistedConfigs());
    setSavedChips(loadPersistedChips());

    const savedLang = localStorage.getItem(LANG_STORAGE_KEY) as Language;
    if (savedLang === 'en' || savedLang === 'ru') setLanguage(savedLang);

    const savedBeta = localStorage.getItem('dmg_calc_beta');
    if (savedBeta === 'true') setIsBetaEnabled(true);
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Clean up incompatible modules when damage type changes
  useEffect(() => {
    const incompatible = MODULES.filter(m => m.allowedDamageTypes && !m.allowedDamageTypes.includes(selectedDamageType));
    let hasChanges = false;
    const next = { ...activeModules };
    incompatible.forEach(m => {
      if (next[m.id]?.enabled) { next[m.id] = { ...next[m.id], enabled: false }; hasChanges = true; }
    });
    if (hasChanges) setActiveModules(next);
  }, [selectedDamageType]);

  // --- Computed ---
  const result = useMemo(() =>
    DamageCalculator.calculate(baseStats, chips, activeModules, selectedDamageType, isBetaEnabled, forceCrit),
    [baseStats, chips, activeModules, selectedDamageType, isBetaEnabled, forceCrit]
  );

  const text = UI_TEXT[language];
  const labels = LABELS[language];
  const baseTooltips = BASE_TOOLTIPS[language];
  const chipTooltips = CHIP_TOOLTIPS[language];
  const damageTypeTooltips = DAMAGE_TYPE_TOOLTIPS[language];

  // --- Helpers ---
  const showToast = (message: string, subMessage = '', type: 'success' | 'info' = 'success') =>
    setToast({ message, subMessage, type });

  const clearWarning = (key: string) => {
    setWarnings(prev => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // --- Handlers ---
  const updateBaseStat = (key: StatKey, value: number) => {
    setBaseStats(prev => ({ ...prev, [key]: value }));
    clearWarning(`base_${key}`);
  };

  const updateChipStat = (chipIndex: number, key: StatKey, value: number) => {
    const finalValue = key === 'level' ? Math.max(1, Math.min(17, Math.round(value))) : value;
    setChips(prev => {
      const next = [...prev];
      next[chipIndex] = { ...next[chipIndex], [key]: finalValue };
      return next;
    });
    // Propagate to linked inventory chip
    const linkedId = chipLinks[chipIndex];
    if (linkedId) {
      setSavedChips(prev => {
        const updated = prev.map(c => {
          if (c.id !== linkedId) return c;
          return { ...c, stats: { ...c.stats, [key]: finalValue }, level: key === 'level' ? finalValue : c.level };
        });
        persistChips(updated);
        return updated;
      });
    }
    clearWarning(`chip_${chipIndex}_${key}`);
  };

  const updateModule = (moduleId: string, state: ModuleState) =>
    setActiveModules(prev => ({ ...prev, [moduleId]: state }));

  const updateCandidate = (key: string, value: number) => {
    setCandidate(prev => ({ ...prev, [key]: value }));
    clearWarning(`candidate_${key}`);
  };

  const applyReplacement = (index: number) => {
    saveChipToInventory(candidate, candidateRank, true);
    setChips(prev => {
      const next = [...prev];
      next[index] = { ...candidate, level: candidateRank };
      return next;
    });
    setCandidate({ ...DEFAULT_CHIP_STATS });
    setWarnings(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { if (k.startsWith('candidate_')) delete next[k]; });
      return next;
    });
  };

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'ru' : 'en';
    setLanguage(newLang);
    localStorage.setItem(LANG_STORAGE_KEY, newLang);
  };

  // --- Config handlers ---
  const saveConfig = () => {
    if (!configName.trim()) return;
    const newConfig: SavedConfig = {
      name: configName, timestamp: Date.now(), baseStats, chips, candidate,
      activeModules, selectedDamageType, level: shipRank, isTemporary, chipLinks,
    };
    setSavedConfigs(prev => upsertConfig(prev, newConfig));
    showToast(text.saveAlert, '', 'success');
  };

  const loadConfig = (config: SavedConfig) => {
    const { baseStats: newBaseStats, chips: newChips, warnings: newWarn } = applyLegacyMigration(config, text.legacyWarning);

    // Sync chips to inventory and build chipLinks
    setSavedChips(prev => {
      let current = [...prev];
      const newLinks: (string | null)[] = Array(5).fill(null);
      let addedCount = 0;

      newChips.forEach((chip, idx) => {
        if (!isChipNonEmpty(chip)) {
          newLinks[idx] = config.chipLinks?.[idx] ?? null;
          return;
        }
        if (current.length >= 300) {
          newLinks[idx] = config.chipLinks?.[idx] ?? null;
          return;
        }
        const rank = chip.level || config.level || 15;
        const res = addChipToInventoryGetId(chip, rank, current);
        if (res.chips.length > current.length) addedCount++;
        current = res.chips;
        newLinks[idx] = res.id;
      });

      if (addedCount > 0 || current.length !== prev.length) {
        persistChips(current);
        if (addedCount > 0) showToast(`${addedCount} ${(text as any).configSyncedChips}`, '', 'info');
      }

      const finalLinks = newLinks.map((lnk, i) => lnk !== null ? lnk : (config.chipLinks?.[i] ?? null));
      setChipLinks(finalLinks);
      return current;
    });

    // Preserve candidate warnings
    const candidateWarnings = Object.fromEntries(
      Object.entries(warnings).filter(([k]) => k.startsWith('candidate_'))
    );

    setBaseStats(newBaseStats);
    setChips(newChips);
    setActiveModules(config.activeModules || {});
    setSelectedDamageType(config.selectedDamageType || 'em');
    setConfigName(config.name);
    const newRank = config.level || 15;
    setShipRank(newRank);
    persistShipRank(newRank);
    setIsTemporary(config.isTemporary || false);
    setWarnings({ ...candidateWarnings, ...newWarn });
    setIsSidebarOpen(false);
    showToast(`${text.configLoaded}: ${config.name}`, text.candidatePreserved, 'info');
  };

  const deleteConfig = (name: string) => {
    if (!confirm(`${text.deleteConfirm} "${name}"?`)) return;
    setSavedConfigs(prev => removeConfig(prev, name));
    showToast(text.configDeleted, name, 'info');
  };

  const createNewConfig = () => {
    setBaseStats(DEFAULT_BASE_STATS);
    setChips(Array.from({ length: 5 }, () => ({ ...DEFAULT_CHIP_STATS })));
    setCandidate({ ...DEFAULT_CHIP_STATS });
    setActiveModules({});
    setSelectedDamageType('em');
    setConfigName('');
    setShipRank(15);
    persistShipRank(15);
    setIsTemporary(false);
    setChipLinks(Array(5).fill(null));
    setWarnings({});
    setIsSidebarOpen(false);
    showToast(text.newConfigCreated, '', 'info');
  };

  // --- Chip inventory handlers ---
  const saveChipToInventory = (chip: Stats, rank: number, silent = false) => {
    setSavedChips(prev => {
      const isDuplicate = prev.some(c => areSameChip(c.stats as Record<string, number>, chip as Record<string, number>));
      if (isDuplicate) {
        if (!silent) showToast(text.duplicateChip, '', 'info');
        return prev;
      }
      const newChip: SavedChip = {
        id: crypto.randomUUID(),
        level: rank,
        stats: { ...chip, level: rank },
        timestamp: Date.now(),
      };
      const next = [...prev, newChip].slice(-300);
      persistChips(next);
      if (!silent) showToast(text.saveAlert, '', 'success');
      return next;
    });
  };

  const scanMissingChips = () => {
    setSavedChips(prev => {
      const allChips: Stats[] = [...chips];
      savedConfigs.forEach(c => allChips.push(...c.chips));

      let added = 0;
      let list = [...prev];
      allChips.forEach(chip => {
        if (!isChipNonEmpty(chip)) return;
        if (list.some(c => areSameChip(c.stats as Record<string, number>, chip as Record<string, number>))) return;
        if (list.length >= 300) return;
        list.push({
          id: crypto.randomUUID(),
          level: chip.level || 15,
          stats: { ...chip, level: chip.level || 15 },
          timestamp: Date.now(),
        });
        added++;
      });

      if (added > 0) {
        persistChips(list);
        showToast((text as any).scanComplete.replace('{count}', added.toString()), '', 'success');
        return list;
      }
      showToast((text as any).noMissingChipsFound, '', 'info');
      return prev;
    });
  };

  const handleExportBackup = () => {
    if (savedConfigs.length === 0 && savedChips.length === 0) {
      showToast(text.noSavedConfigs, '', 'info');
      return;
    }
    exportBackup(savedConfigs, savedChips, shipRank);
    showToast(text.configExported, '', 'success');
  };

  const handleImportBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const { configs, chips: importedChips, shipRank: importedRank } = parseBackupFile(event.target?.result as string);

          if (configs.length > 0) {
            setSavedConfigs(prev => {
              const map = new Map(prev.map(c => [c.name, c]));
              configs.forEach(c => { if (c.name) map.set(c.name, c); });
              const merged = Array.from(map.values());
              persistConfigs(merged);
              return merged;
            });
          }

          if (importedRank !== undefined) {
            setShipRank(importedRank);
            persistShipRank(importedRank);
          }

          setSavedChips(prev => {
            const merged = mergeImportedChips(prev, importedChips);
            if (merged !== prev) persistChips(merged);
            return merged;
          });

          showToast(text.importSuccess, '', 'success');
        } catch {
          showToast(text.importError, '', 'info');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // --- Render ---
  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">

      {/* Mobile overlays */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}
      {isAnalysisOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsAnalysisOpen(false)} />
      )}

      {/* Sidebar */}
      <Sidebar
        savedConfigs={savedConfigs}
        configName={configName}
        isBetaEnabled={isBetaEnabled}
        language={language}
        isSidebarOpen={isSidebarOpen}
        texts={text}
        onConfigNameChange={setConfigName}
        onSaveConfig={saveConfig}
        onLoadConfig={loadConfig}
        onDeleteConfig={deleteConfig}
        onCreateNew={createNewConfig}
        onToggleLanguage={toggleLanguage}
        onToggleBeta={() => {
          if (isBetaEnabled) {
            setIsBetaEnabled(false);
            localStorage.setItem('dmg_calc_beta', 'false');
          } else {
            setIsBetaPopupOpen(true);
          }
        }}
        onImportBackup={handleImportBackup}
        onExportBackup={handleExportBackup}
        onCloseSidebar={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 bg-slate-900/50 relative">
        {/* Mobile header */}
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

        {/* Main tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-3 pt-1.5">
          {(['editor', 'global_analysis', 'inventory'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveMainTab(tab)}
              className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeMainTab === tab
                  ? 'border-blue-500 text-blue-400 bg-slate-900/50'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
              }`}
            >
              {tab === 'editor' ? text.shipEditor : tab === 'global_analysis' ? text.globalAnalysis : text.chipInventory}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 md:p-3 space-y-3">
          {activeMainTab === 'editor' ? (
            <>
              <BaseStatsSection
                baseStats={baseStats}
                selectedDamageType={selectedDamageType}
                shipRank={shipRank}
                isTemporary={isTemporary}
                forceCrit={forceCrit}
                warnings={warnings}
                texts={text}
                labels={labels}
                baseTooltips={baseTooltips}
                damageTypeTooltips={damageTypeTooltips}
                onUpdateBaseStat={updateBaseStat}
                onSetDamageType={setSelectedDamageType}
                onSetShipRank={(rank) => { setShipRank(rank); persistShipRank(rank); }}
                onSetTemporary={setIsTemporary}
                onSetForceCrit={setForceCrit}
              />

              <ChipsSection
                chips={chips}
                chipLinks={chipLinks}
                activeChipTab={activeChipTab}
                selectedDamageType={selectedDamageType}
                warnings={warnings}
                texts={text}
                labels={labels}
                chipTooltips={chipTooltips}
                onSetActiveChipTab={setActiveChipTab}
                onUpdateChipStat={updateChipStat}
                onOpenAutoBuilder={() => setIsAutoBuilderOpen(true)}
                onChangeChipSlot={setChangeChipSlotIdx}
              />

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
              forceCrit={forceCrit}
              texts={text}
              labels={labels}
            />
          ) : (
            <ChipInventory
              savedChips={savedChips}
              onDeleteChip={(id) => {
                const next = savedChips.filter(c => c.id !== id);
                setSavedChips(next);
                persistChips(next);
              }}
              onUpdateChip={(id, updatedChip) => {
                const next = savedChips.map(c => c.id === id ? updatedChip : c);
                setSavedChips(next);
                persistChips(next);
              }}
              onScanMissing={scanMissingChips}
              onLoadAsCandidate={(chip) => {
                setCandidate({ ...chip.stats });
                setCandidateRank(chip.level);
                setActiveMainTab('editor');
                showToast((text as any).loadAsCandidate, '', 'info');
              }}
              texts={text as any}
              labels={labels}
            />
          )}

          <div className="w-full flex justify-center mt-8 pb-4">
            <span className="text-xs font-mono text-slate-600 select-none">v{APP_VERSION}</span>
          </div>
          <div className="h-4 lg:hidden" />

          {/* Toast */}
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

      {/* Analysis panel */}
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
          forceCrit={forceCrit}
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

      {/* Beta popup */}
      {isBetaPopupOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4">
              <h3 className="text-lg font-bold text-slate-100 mb-2">{text.betaPopupTitle}</h3>
              <p className="text-slate-400 text-xs mb-3">{text.betaPopupDesc}</p>
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

      {/* Auto-builder modal */}
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
        forceCrit={forceCrit}
        texts={text}
        labels={labels}
        onApplyBuild={(newChips) => {
          setChips(newChips);
          showToast(text.autoBuildApplied, text.chipsUpdated, 'success');
        }}
      />

      {/* Chip slot switcher modal */}
      {changeChipSlotIdx !== null && (
        <ChipSlotSwitcherModal
          isOpen={true}
          slotIndex={changeChipSlotIdx}
          savedChips={savedChips}
          currentLinkId={chipLinks[changeChipSlotIdx]}
          onClose={() => setChangeChipSlotIdx(null)}
          onSelectChip={(chip) => {
            const idx = changeChipSlotIdx;
            setChips(prev => {
              const next = [...prev];
              next[idx] = { ...chip.stats };
              return next;
            });
            setChipLinks(prev => {
              const next = [...prev];
              next[idx] = chip.id;
              return next;
            });
            setChangeChipSlotIdx(null);
            showToast(`${text.chip} ${idx + 1}: ${(text as any).changeChip}`, chip.note || '', 'success');
          }}
          onCreateNewChip={() => {
            const idx = changeChipSlotIdx;
            setSavedChips(prev => {
              const newChip: SavedChip = {
                id: crypto.randomUUID(),
                level: shipRank,
                stats: { ...chips[idx] },
                timestamp: Date.now(),
              };
              const next = [...prev, newChip].slice(-300);
              persistChips(next);
              setChipLinks(links => {
                const nl = [...links];
                nl[idx] = newChip.id;
                return nl;
              });
              return next;
            });
            setChangeChipSlotIdx(null);
            showToast((text as any).createNewChip, '', 'success');
          }}
          texts={text as any}
          labels={labels}
        />
      )}
    </div>
  );
}