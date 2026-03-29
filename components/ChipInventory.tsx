import React, { useState } from 'react';
import { SavedChip, StatKey } from '../types';
import { UI_TEXT, CHIP_STATS_KEYS } from '../constants';
import { Trash2, Edit2, Check, X, Settings } from 'lucide-react';
import { ChipEditorModal } from './ChipEditorModal';

interface ChipInventoryProps {
  savedChips: SavedChip[];
  onDeleteChip: (id: string) => void;
  onUpdateChip: (id: string, updatedChip: SavedChip) => void;
  texts: typeof UI_TEXT['en'];
  labels: Record<StatKey, string>;
}

export const ChipInventory: React.FC<ChipInventoryProps> = ({
  savedChips,
  onDeleteChip,
  onUpdateChip,
  texts,
  labels,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");
  const [fullEditingChip, setFullEditingChip] = useState<SavedChip | null>(null);

  const startEditing = (chip: SavedChip) => {
    setEditingId(chip.id);
    setEditNote(chip.note || "");
  };

  const saveEdit = (chip: SavedChip) => {
    onUpdateChip(chip.id, { ...chip, note: editNote });
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNote("");
  };

  return (
    <div className="bg-slate-800/40 rounded-xl p-2.5 sm:p-3 border border-slate-700/50">
      <h2 className="text-lg font-bold text-slate-100 mb-4">{texts.chipInventory}</h2>

      {savedChips.length === 0 ? (
        <div className="text-center py-12 text-slate-500 bg-slate-900/50 rounded-lg border border-slate-800 border-dashed">
          <p>{texts.noChipsSaved}</p>
          <p className="text-sm mt-2">{texts.saveChipsHint}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {savedChips.map((chip) => (
            <div key={chip.id} className="bg-slate-900/80 border border-slate-700 rounded-lg p-3 flex flex-col relative group hover:border-blue-500/50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-900/50 text-blue-400 text-[11px] font-bold px-2 py-0.5 rounded border border-blue-800/50">
                    {texts.rank} {chip.level}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setFullEditingChip(chip)}
                    className="text-slate-500 hover:text-blue-400 transition-colors p-1 rounded hover:bg-slate-800"
                    title="Edit Chip"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteChip(chip.id)}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded hover:bg-slate-800"
                    title="Delete Chip"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-3 text-sm flex-1">
                {CHIP_STATS_KEYS.map((key) => {
                  const value = chip.stats[key];
                  if (!value) return null;
                  return (
                    <div key={key} className="flex justify-between items-center bg-slate-800/50 px-1.5 py-0.5 rounded">
                      <span className="text-slate-400 text-[10px] truncate mr-2" title={labels[key]}>{labels[key]}</span>
                      <span className="text-slate-200 font-mono text-[11px]">{value}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-auto pt-2 border-t border-slate-800">
                {editingId === chip.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder="Add a note..."
                      className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-blue-500 outline-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(chip);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                    />
                    <button onClick={() => saveEdit(chip)} className="text-emerald-400 hover:text-emerald-300 p-1">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-300 p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between group/note cursor-pointer" onClick={() => startEditing(chip)}>
                    <span className={`text-xs truncate ${chip.note ? 'text-slate-300' : 'text-slate-600 italic'}`}>
                      {chip.note || "Add note..."}
                    </span>
                    <Edit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover/note:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ChipEditorModal
        isOpen={!!fullEditingChip}
        onClose={() => setFullEditingChip(null)}
        chip={fullEditingChip}
        onSave={(updatedChip) => {
          onUpdateChip(updatedChip.id, updatedChip);
          setFullEditingChip(null);
        }}
        texts={texts}
        labels={labels}
      />
    </div>
  );
};
