import React, { useState, useEffect } from 'react';
import { SavedChip, StatKey } from '../types';
import { X, Save } from 'lucide-react';
import { CHIP_STATS_KEYS } from '../constants';

interface ChipEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  chip: SavedChip | null;
  onSave: (updatedChip: SavedChip) => void;
  texts: any;
  labels: Record<StatKey, string>;
}

export const ChipEditorModal: React.FC<ChipEditorModalProps> = ({
  isOpen,
  onClose,
  chip,
  onSave,
  texts,
  labels,
}) => {
  const [editedChip, setEditedChip] = useState<SavedChip | null>(null);

  useEffect(() => {
    if (chip && isOpen) {
      setEditedChip(JSON.parse(JSON.stringify(chip))); // Deep copy
    }
  }, [chip, isOpen]);

  if (!isOpen || !editedChip) return null;

  const handleStatChange = (key: StatKey, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditedChip(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        stats: {
          ...prev.stats,
          [key]: numValue
        }
      };
    });
  };

  const handleLevelChange = (value: string) => {
    const numValue = Math.max(1, Math.min(17, parseInt(value, 10) || 1));
    setEditedChip(prev => {
      if (!prev) return prev;
      return { ...prev, level: numValue, stats: { ...prev.stats, level: numValue } };
    });
  };

  const handleNoteChange = (value: string) => {
    setEditedChip(prev => {
      if (!prev) return prev;
      return { ...prev, note: value };
    });
  };

  const handleSave = () => {
    if (editedChip) {
      onSave(editedChip);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Save className="w-5 h-5 text-blue-400" />
            Edit Chip
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">{texts.rank}</label>
              <input
                type="number"
                min="1"
                max="17"
                value={editedChip.level || ''}
                onChange={(e) => handleLevelChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-sm text-slate-200 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Note</label>
              <input
                type="text"
                value={editedChip.note || ''}
                onChange={(e) => handleNoteChange(e.target.value)}
                placeholder="Add a note..."
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-sm text-slate-200 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-300 mb-2 border-b border-slate-800 pb-1.5">Stats</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CHIP_STATS_KEYS.filter(key => key !== 'level').map((key) => (
                <div key={key}>
                  <label className="block text-[11px] font-medium text-slate-500 mb-0.5 truncate" title={labels[key]}>
                    {labels[key]}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editedChip.stats[key] || ''}
                    onChange={(e) => handleStatChange(key, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-slate-800 bg-slate-950/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {texts.cancel}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
