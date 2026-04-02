import React from 'react';
import { Save, Trash2, Plus, Globe, Upload, Download } from 'lucide-react';
import { SavedConfig, Language } from '../types';
import { UI_TEXT } from '../constants';

interface SidebarProps {
  savedConfigs: SavedConfig[];
  configName: string;
  isBetaEnabled: boolean;
  language: Language;
  isSidebarOpen: boolean;
  texts: typeof UI_TEXT['en'];
  onConfigNameChange: (name: string) => void;
  onSaveConfig: () => void;
  onLoadConfig: (config: SavedConfig) => void;
  onDeleteConfig: (name: string) => void;
  onCreateNew: () => void;
  onToggleLanguage: () => void;
  onToggleBeta: () => void;
  onImportBackup: () => void;
  onExportBackup: () => void;
  onCloseSidebar: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  savedConfigs,
  configName,
  isBetaEnabled,
  language,
  isSidebarOpen,
  texts,
  onConfigNameChange,
  onSaveConfig,
  onLoadConfig,
  onDeleteConfig,
  onCreateNew,
  onToggleLanguage,
  onToggleBeta,
  onImportBackup,
  onExportBackup,
  onCloseSidebar,
}) => {
  return (
    <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 w-80 md:w-64 bg-slate-950 border-r border-slate-800 transition-transform duration-300 fixed md:static z-50 h-full flex flex-col shrink-0 shadow-2xl md:shadow-none`}>
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <h1 className="text-lg font-bold text-blue-500 tracking-tight">{texts.appTitle}</h1>
        <button onClick={onCloseSidebar} className="md:hidden text-slate-400 hover:text-white">✕</button>
      </div>

      <div className="p-3 space-y-3 flex-1 overflow-y-auto">
        {/* Language toggle */}
        <button
          onClick={onToggleLanguage}
          className="w-full flex items-center justify-center gap-2 p-1.5 rounded bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800 transition-all text-xs font-medium text-slate-300"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{language === 'en' ? 'English' : 'Русский'}</span>
        </button>

        {/* Beta toggle */}
        <div className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300">
          <span>{texts.betaVersion}</span>
          <button
            onClick={onToggleBeta}
            className={`w-8 h-4 rounded-full relative transition-colors ${isBetaEnabled ? 'bg-blue-500' : 'bg-slate-700'}`}
          >
            <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${isBetaEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {/* New config */}
        <button
          onClick={onCreateNew}
          className="w-full flex items-center justify-center gap-2 p-1.5 rounded bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600/30 hover:border-emerald-500/50 transition-all text-xs font-medium text-emerald-400"
        >
          <Plus className="w-4 h-4" />
          <span>{texts.newConfig}</span>
        </button>

        {/* Save current config */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500 uppercase">{texts.currentConfig}</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={configName}
              onChange={(e) => onConfigNameChange(e.target.value)}
              placeholder={texts.configNamePlaceholder}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
            />
            <button onClick={onSaveConfig} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded">
              <Save className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Saved config list */}
        <div className="space-y-2 pt-4">
          <label className="text-xs font-semibold text-slate-500 uppercase">{texts.savedConfigs}</label>
          {savedConfigs.length === 0 ? (
            <div className="text-slate-600 text-sm italic">{texts.noSavedConfigs}</div>
          ) : (
            <div className="space-y-2">
              {savedConfigs.map(config => (
                <div
                  key={config.name}
                  className="group flex items-center justify-between p-3 bg-slate-900 rounded border border-slate-800 hover:border-slate-600 transition-all"
                >
                  <button
                    onClick={() => onLoadConfig(config)}
                    className="text-sm font-medium text-slate-300 hover:text-white flex-1 text-left truncate"
                  >
                    {config.name}
                  </button>
                  <button
                    onClick={() => onDeleteConfig(config.name)}
                    className="text-slate-600 hover:text-red-400 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Import / Export */}
          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-800">
            <button
              onClick={onImportBackup}
              className="flex items-center justify-center gap-2 p-2 rounded bg-slate-800 border border-slate-700 hover:border-slate-500 hover:bg-slate-700 transition-all text-sm font-medium text-slate-300"
            >
              <Upload className="w-4 h-4" />
              <span>{texts.importBackup}</span>
            </button>
            <button
              onClick={onExportBackup}
              disabled={savedConfigs.length === 0}
              className={`flex items-center justify-center gap-2 p-2 rounded border transition-all text-sm font-medium ${
                savedConfigs.length === 0
                  ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-800 border-slate-700 hover:border-slate-500 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>{texts.exportBackup}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
