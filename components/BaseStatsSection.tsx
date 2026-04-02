import React from 'react';
import { BarChart2 } from 'lucide-react';
import { Stats, StatKey, DamageType } from '../types';
import { BASE_STATS_KEYS, UI_TEXT } from '../constants';

import { StatInput } from './StatInput';

interface BaseStatsSectionProps {
  baseStats: Stats;
  selectedDamageType: DamageType;
  shipRank: number;
  isTemporary: boolean;
  forceCrit: boolean;
  warnings: Record<string, string>;
  texts: typeof UI_TEXT['en'];
  labels: Record<string, string>;
  baseTooltips: Record<string, string>;
  damageTypeTooltips: Record<DamageType, string>;
  onUpdateBaseStat: (key: StatKey, value: number) => void;
  onSetDamageType: (type: DamageType) => void;
  onSetShipRank: (rank: number) => void;
  onSetTemporary: (val: boolean) => void;
  onSetForceCrit: (val: boolean) => void;
}

export const BaseStatsSection: React.FC<BaseStatsSectionProps> = ({
  baseStats,
  selectedDamageType,
  shipRank,
  isTemporary,
  forceCrit,
  warnings,
  texts,
  labels,
  baseTooltips,
  damageTypeTooltips,
  onUpdateBaseStat,
  onSetDamageType,
  onSetShipRank,
  onSetTemporary,
  onSetForceCrit,
}) => {
  return (
    <div className="bg-slate-800/40 rounded-xl p-2 sm:p-3 border border-slate-700/50">
      <div className="flex items-center gap-2 mb-2">
        <BarChart2 className="w-4 h-4 text-blue-400" />
        <h2 className="text-sm font-bold">{texts.baseStats}</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        {/* 1. Damage */}
        <StatInput
          key="damage"
          statKey="damage"
          label={labels["damage"]}
          description={baseTooltips["damage"]}
          value={baseStats["damage"] || 0}
          onChange={onUpdateBaseStat}
          warning={warnings['base_damage']}
        />

        {/* 2. Damage Type Selector */}
        <div className="flex flex-col relative">
          <label className="text-slate-400 font-medium text-xs truncate mb-0.5">
            {texts.damageType}
          </label>
          <div className="bg-slate-800 border border-slate-700 rounded text-slate-100 px-2 py-1.5 h-8 flex items-center justify-center gap-3">
            <button
              onClick={() => onSetDamageType('em')}
              title={damageTypeTooltips.em}
              className={`w-5 h-5 rounded-full bg-blue-500 transition-all shadow-sm ${selectedDamageType === 'em' ? 'ring-2 ring-white scale-110 opacity-100' : 'opacity-40 hover:opacity-100 hover:scale-110'}`}
            />
            <button
              onClick={() => onSetDamageType('thermal')}
              title={damageTypeTooltips.thermal}
              className={`w-5 h-5 rounded-full bg-red-500 transition-all shadow-sm ${selectedDamageType === 'thermal' ? 'ring-2 ring-white scale-110 opacity-100' : 'opacity-40 hover:opacity-100 hover:scale-110'}`}
            />
            <button
              onClick={() => onSetDamageType('kinetic')}
              title={damageTypeTooltips.kinetic}
              className={`w-5 h-5 rounded-full bg-yellow-400 transition-all shadow-sm ${selectedDamageType === 'kinetic' ? 'ring-2 ring-white scale-110 opacity-100' : 'opacity-40 hover:opacity-100 hover:scale-110'}`}
            />
          </div>
        </div>

        {/* 3. Remaining Base Stats */}
        {BASE_STATS_KEYS.filter(key => key !== 'damage').map(key => (
          <StatInput
            key={key}
            statKey={key}
            label={labels[key]}
            description={baseTooltips[key]}
            value={baseStats[key] || 0}
            onChange={onUpdateBaseStat}
            warning={warnings[`base_${key}`]}
            min={key === 'number_of_cannons' ? 1 : undefined}
          />
        ))}

        {/* 4. Ship Rank */}
        <div className="flex flex-col relative">
          <label className="text-slate-400 font-medium text-xs truncate mb-0.5" title={texts.shipRank}>
            {texts.shipRank}
          </label>
          <input
            type="number"
            min="1"
            max="17"
            value={shipRank}
            onChange={(e) => onSetShipRank(Math.max(1, Math.min(17, Number(e.target.value))))}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-sm text-slate-100 focus:border-blue-500 outline-none transition-colors h-8"
          />
        </div>

        {/* 5. Temporary Build Toggle */}
        <div className="flex flex-col relative justify-end h-full">
          <label className="flex items-center gap-2 cursor-pointer group h-8">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                className="sr-only"
                checked={isTemporary}
                onChange={(e) => onSetTemporary(e.target.checked)}
              />
              <div className={`block w-8 h-5 rounded-full transition-colors ${isTemporary ? 'bg-blue-500' : 'bg-slate-700'}`} />
              <div className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${isTemporary ? 'translate-x-3' : ''}`} />
            </div>
            <span className="text-xs font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
              {texts.temporaryBuild}
            </span>
          </label>
        </div>

        {/* 6. Force Crit Toggle */}
        <div className="flex flex-col relative justify-end h-full">
          <label className="flex items-center gap-2 cursor-pointer group h-8" title={(texts as any).forceCritTooltip}>
            <div className="relative flex items-center">
              <input
                type="checkbox"
                className="sr-only"
                checked={forceCrit}
                onChange={(e) => onSetForceCrit(e.target.checked)}
              />
              <div className={`block w-8 h-5 rounded-full transition-colors ${forceCrit ? 'bg-amber-500' : 'bg-slate-700'}`} />
              <div className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${forceCrit ? 'translate-x-3' : ''}`} />
            </div>
            <span className={`text-xs font-medium transition-colors ${forceCrit ? 'text-amber-400 group-hover:text-amber-300' : 'text-slate-400 group-hover:text-slate-300'}`}>
              {(texts as any).forceCrit}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};
