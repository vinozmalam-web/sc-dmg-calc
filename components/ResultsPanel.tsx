import React from 'react';
import { CalculationResult, DpsStats, StatKey } from '../types';
import { Activity, Crosshair, Zap, ShieldAlert, Timer } from 'lucide-react';
import { UI_TEXT } from '../constants';

interface ResultsPanelProps {
  result: CalculationResult;
  labels: Record<StatKey, string>;
  texts: typeof UI_TEXT['en'];
}

const StatCard = ({ label, value, subLabel }: { label: string; value: string; subLabel?: string }) => (
  <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
    <div className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">{label}</div>
    <div className="text-lg font-bold text-white mt-0.5">{value}</div>
    {subLabel && <div className="text-slate-500 text-[10px] mt-0.5">{subLabel}</div>}
  </div>
);

const DpsSection = ({ title, stats, colorClass, texts }: { title: string; stats: DpsStats; colorClass: string; texts: typeof UI_TEXT['en'] }) => (
  <div className="bg-slate-800 rounded-xl p-3 border border-slate-700 shadow-lg">
    <h3 className={`text-base font-bold mb-3 flex items-center gap-2 ${colorClass}`}>
      <Crosshair className="w-4 h-4" /> {title}
    </h3>
    <div className="grid grid-cols-2 gap-2">
      <StatCard label={texts.dpm} value={stats.dpm.toLocaleString(undefined, { maximumFractionDigits: 1 })} />
      <StatCard label={texts.totalDps} value={stats.total_dps.toLocaleString(undefined, { maximumFractionDigits: 1 })} />
    </div>
  </div>
);

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ result, labels, texts }) => {
  const finalKeys: { key: StatKey; icon: React.ReactNode }[] = [
    { key: "fire_rate", icon: <Zap className="w-3.5 h-3.5 text-yellow-500" /> },
    { key: "range", icon: <Crosshair className="w-3.5 h-3.5 text-green-500" /> },
    { key: "crit_chance", icon: <Activity className="w-3.5 h-3.5 text-red-500" /> },
    { key: "crit_power", icon: <Activity className="w-3.5 h-3.5 text-red-400" /> },
    { key: "overheat", icon: <ShieldAlert className="w-3.5 h-3.5 text-orange-500" /> },
    { key: "cooldown", icon: <Timer className="w-3.5 h-3.5 text-blue-500" /> },
  ];

  return (
    <div className="space-y-4">
      {/* DPS/DPM Rows */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <DpsSection title={texts.specOps} stats={result.spec_ops} colorClass="text-blue-400" texts={texts} />
        <DpsSection title={texts.general} stats={result.general} colorClass="text-emerald-400" texts={texts} />
      </div>

      {/* Final Attributes */}
      <div className="bg-slate-800 rounded-xl p-3 border border-slate-700 shadow-lg">
        <h3 className="text-slate-200 font-bold mb-2 flex items-center gap-2 text-sm">
            <Activity className="w-4 h-4 text-indigo-400" /> {texts.finalAttributes}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {finalKeys.map(({ key, icon }) => (
            <div key={key} className="flex flex-col items-center p-2 bg-slate-900/50 rounded-lg border border-slate-700/50">
              <div className="flex items-center gap-1.5 mb-0.5">
                {icon}
                <span className="text-[11px] text-slate-400 font-medium">{labels[key]}</span>
              </div>
              <span className="text-base font-bold text-white">
                {key === 'overheat' 
                  ? result.final_stats[key]?.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) ?? "0.0"
                  : result.final_stats[key]?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? "0"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};