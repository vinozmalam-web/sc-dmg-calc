import React from 'react';
import { Cpu, Zap, ArrowLeftRight } from 'lucide-react';
import { Stats, StatKey, DamageType } from '../types';
import { CHIP_STATS_KEYS, UI_TEXT } from '../constants';
import { StatInput } from './StatInput';

interface ChipsSectionProps {
  chips: Stats[];
  chipLinks: (string | null)[];
  activeChipTab: number;
  selectedDamageType: DamageType;
  warnings: Record<string, string>;
  texts: typeof UI_TEXT['en'];
  labels: Record<string, string>;
  chipTooltips: Record<string, string>;
  onSetActiveChipTab: (idx: number) => void;
  onUpdateChipStat: (chipIndex: number, key: StatKey, value: number) => void;
  onOpenAutoBuilder: () => void;
  onChangeChipSlot: (slotIdx: number) => void;
}

export const ChipsSection: React.FC<ChipsSectionProps> = ({
  chips,
  chipLinks,
  activeChipTab,
  selectedDamageType,
  warnings,
  texts,
  labels,
  chipTooltips,
  onSetActiveChipTab,
  onUpdateChipStat,
  onOpenAutoBuilder,
  onChangeChipSlot,
}) => {
  return (
    <div className="bg-slate-800/40 rounded-xl p-2 sm:p-3 border border-slate-700/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-orange-400" />
          <h2 className="text-sm font-bold">{texts.chipsConfig}</h2>
        </div>
        <button
          onClick={onOpenAutoBuilder}
          className="flex items-center gap-2 px-2 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 hover:text-blue-300 border border-blue-500/30 rounded text-[11px] font-medium transition-colors"
        >
          <Zap className="w-3 h-3" />
          {texts.autoBuilder}
        </button>
      </div>

      {/* Chip slot tabs */}
      <div className="flex border-b border-slate-700 mb-3 overflow-x-auto pb-1 scrollbar-none items-end">
        {[0, 1, 2, 3, 4].map(idx => (
          <button
            key={idx}
            onClick={() => onSetActiveChipTab(idx)}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] font-medium transition-colors border-b-2 whitespace-nowrap flex items-center gap-1 ${
              activeChipTab === idx
                ? 'border-blue-500 text-blue-400 bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            {texts.chip} {idx + 1}
            {chipLinks[idx] !== null && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500/40 inline-block" title="Linked to inventory" />
            )}
          </button>
        ))}
      </div>

      {/* Link banner + Change Chip button */}
      <div className="flex items-center gap-2 mb-2">
        {chipLinks[activeChipTab] !== null ? (
          <div className="flex-1 flex items-start gap-1.5 bg-amber-500/8 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
            <ArrowLeftRight className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
            <span className="text-[11px] text-amber-300/80 leading-snug">
              {(texts as any).chipLinkedBanner}
            </span>
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg px-2.5 py-1.5">
            <ArrowLeftRight className="w-3 h-3 text-slate-500 shrink-0" />
            <span className="text-[11px] text-slate-500 leading-snug">
              {(texts as any).chipUnlinked}
            </span>
          </div>
        )}
        <button
          onClick={() => onChangeChipSlot(activeChipTab)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 hover:border-amber-500/60 text-amber-400 hover:text-amber-300 rounded-lg text-xs font-semibold transition-all shrink-0 shadow-sm"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          {(texts as any).changeChip}
        </button>
      </div>

      {/* Chip stat inputs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 animate-in fade-in duration-300">
        {CHIP_STATS_KEYS.map(key => (
          <StatInput
            key={key}
            statKey={key}
            label={labels[key]}
            description={chipTooltips[key]}
            value={chips[activeChipTab][key] || 0}
            onChange={(k, v) => onUpdateChipStat(activeChipTab, k, v)}
            warning={warnings[`chip_${activeChipTab}_${key}`]}
            min={key === 'level' ? 1 : undefined}
            max={key === 'level' ? 17 : undefined}
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
  );
};
