import React, { useState, useMemo } from 'react';
import { SavedChip, StatKey } from '../types';
import { CHIP_STATS_KEYS } from '../constants';
import { filterChips } from '../utils/chipSearch';
import { X, Plus, Search, Check, Link } from 'lucide-react';

interface ChipSlotSwitcherModalProps {
  isOpen: boolean;
  slotIndex: number;
  savedChips: SavedChip[];
  currentLinkId: string | null;
  onClose: () => void;
  onSelectChip: (chip: SavedChip) => void;
  onCreateNewChip: () => void;
  texts: any;
  labels: Record<StatKey, string>;
}

export const ChipSlotSwitcherModal: React.FC<ChipSlotSwitcherModalProps> = ({
  isOpen,
  slotIndex,
  savedChips,
  currentLinkId,
  onClose,
  onSelectChip,
  onCreateNewChip,
  texts,
  labels,
}) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return filterChips(savedChips, search, texts, labels);
  }, [savedChips, search, labels, texts]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60 rounded-t-xl shrink-0">
          <div className="flex items-center gap-2">
            <Link className="w-4 h-4 text-amber-400" />
            <h3 className="text-base font-bold text-slate-100">
              {texts.chipSwitcherTitle} #{slotIndex + 1}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-800 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`${texts.selectInventoryChip}...`}
              autoFocus
              className="w-full bg-slate-800 border border-slate-700 rounded pl-8 pr-3 py-1.5 text-sm text-slate-200 focus:border-blue-500 outline-none placeholder-slate-600"
            />
          </div>
          <div className="text-[11px] text-slate-600 mt-1.5 ml-0.5">
            {filtered.length} / {savedChips.length} {texts.chipsInInventory}
          </div>
        </div>

        {/* Chip List */}
        <div className="overflow-y-auto flex-1 p-3 space-y-2 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              {savedChips.length === 0 ? texts.noChipsInInventory : 'No chips match your search.'}
            </div>
          ) : (
            filtered.map(chip => {
              const isLinked = chip.id === currentLinkId;
              const nonZeroStats = CHIP_STATS_KEYS.filter(k => k !== 'level' && (chip.stats[k] || 0) !== 0);
              return (
                <button
                  key={chip.id}
                  onClick={() => onSelectChip(chip)}
                  className={`w-full text-left p-3 rounded-lg border transition-all group relative ${
                    isLinked
                      ? 'border-amber-500/60 bg-amber-500/10 hover:bg-amber-500/20'
                      : 'border-slate-700 bg-slate-800/50 hover:border-blue-500/50 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-900/60 text-blue-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-800/50">
                        {texts.rank} {chip.level}
                      </span>
                      {chip.note && (
                        <span className="text-slate-300 text-xs font-medium truncate max-w-[200px]">{chip.note}</span>
                      )}
                    </div>
                    {isLinked && (
                      <span className="flex items-center gap-1 text-amber-400 text-[10px] font-semibold shrink-0">
                        <Check className="w-3 h-3" /> current
                      </span>
                    )}
                  </div>

                  {nonZeroStats.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-3 gap-y-0.5">
                      {nonZeroStats.map(key => (
                        <div key={key} className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500 truncate mr-1">{labels[key]}</span>
                          <span className="text-slate-300 font-mono">{chip.stats[key]}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-600 text-[10px] italic">Empty chip</div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer — Create New */}
        <div className="p-3 border-t border-slate-800 shrink-0">
          <button
            onClick={onCreateNewChip}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg bg-emerald-600/15 border border-emerald-500/30 hover:bg-emerald-600/25 hover:border-emerald-500/50 transition-all text-sm font-medium text-emerald-400"
          >
            <Plus className="w-4 h-4" />
            {texts.createNewChip}
          </button>
        </div>
      </div>
    </div>
  );
};
