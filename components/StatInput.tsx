import React from 'react';
import { StatKey } from '../types';

interface StatInputProps {
  statKey: StatKey;
  value: number;
  label: string;
  onChange: (key: StatKey, value: number) => void;
  className?: string;
  compact?: boolean;
}

export const StatInput: React.FC<StatInputProps> = ({ statKey, value, label, onChange, className = "", compact = false }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onChange(statKey, isNaN(val) ? 0 : val);
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <label className={`text-slate-400 font-medium ${compact ? 'text-xs mb-0.5' : 'text-sm mb-1'} truncate`}>
        {label}
      </label>
      <input
        type="number"
        value={value || ''}
        placeholder="0"
        onChange={handleChange}
        className={`
          bg-slate-800 border border-slate-700 rounded text-slate-100 
          focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all
          ${compact ? 'px-2 py-1 text-sm' : 'px-3 py-2 text-base'}
        `}
      />
    </div>
  );
};
