import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { StatKey } from '../types';
import { Info } from 'lucide-react';

interface StatInputProps {
  statKey: StatKey;
  value: number;
  label: string;
  description?: string;
  onChange: (key: StatKey, value: number) => void;
  className?: string;
  compact?: boolean;
}

const TooltipPortal = ({ content, targetRect, visible }: { content: string, targetRect: DOMRect | null, visible: boolean }) => {
    if (!visible || !targetRect) return null;

    // Center tooltip above the target
    const style: React.CSSProperties = {
        position: 'fixed',
        top: targetRect.top - 8,
        left: targetRect.left + targetRect.width / 2,
        transform: 'translate(-50%, -100%)',
        zIndex: 9999,
        pointerEvents: 'none'
    };

    return createPortal(
        <div style={style}>
            <div className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg shadow-xl p-2.5 w-48 text-center relative animate-in fade-in zoom-in-95 duration-200">
                {content}
                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-slate-700"></div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[2px] border-4 border-transparent border-t-slate-900"></div>
            </div>
        </div>,
        document.body
    );
};

export const StatInput: React.FC<StatInputProps> = ({ statKey, value, label, description, onChange, className = "", compact = false }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const iconRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onChange(statKey, isNaN(val) ? 0 : val);
  };

  const handleMouseEnter = () => {
    if (iconRef.current) {
        setRect(iconRef.current.getBoundingClientRect());
        setShowTooltip(true);
    }
  };

  return (
    <div className={`flex flex-col relative ${className}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <label className={`text-slate-400 font-medium ${compact ? 'text-xs' : 'text-sm'} truncate`}>
            {label}
        </label>
        {description && (
            <>
                <div 
                    ref={iconRef}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={() => setShowTooltip(false)}
                    className="cursor-help flex items-center justify-center rounded-full hover:bg-slate-800 transition-colors p-0.5"
                >
                    <Info className="w-3.5 h-3.5 text-slate-600 hover:text-blue-400 transition-colors" />
                </div>
                <TooltipPortal content={description} targetRect={rect} visible={showTooltip} />
            </>
        )}
      </div>
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