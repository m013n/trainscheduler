import React, { useState } from 'react';
import { Member, MemberLevel } from '../types';
import { UserPlus, ArrowUpCircle, ArrowDownCircle, Trash2, Edit2, Check, X } from 'lucide-react';

interface MemberToolbarProps {
  selectedMember: Member | null;
  onAddMember: (name: string, level: MemberLevel) => void;
  onUpdateLevel: (memberId: string, newLevel: MemberLevel) => void;
  onUpdateName: (memberId: string, newName: string) => void;
  onDeleteMember: (memberId: string) => void;
}

const LEVEL_RANK_ORDER: MemberLevel[] = ['r1', 'r2', 'r3', 'r4', 'r5'];

export const MemberToolbar: React.FC<MemberToolbarProps> = ({
  selectedMember,
  onAddMember,
  onUpdateLevel,
  onUpdateName,
  onDeleteMember,
}) => {
  const [nameInput, setNameInput] = useState('');
  const [levelInput, setLevelInput] = useState<MemberLevel>('r1');
  const [isAdding, setIsAdding] = useState(false);
  
  // Inline editing state for selected member
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    onAddMember(nameInput.trim(), levelInput);
    setNameInput('');
    setIsAdding(false);
  };

  const handleStartEdit = () => {
    if (selectedMember) {
      setEditedName(selectedMember.name);
      setIsEditingName(true);
    }
  };

  const handleSaveEdit = () => {
    if (selectedMember && editedName.trim()) {
      onUpdateName(selectedMember.id, editedName.trim());
      setIsEditingName(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
  };

  const handlePromote = () => {
    if (!selectedMember) return;
    const currentIndex = LEVEL_RANK_ORDER.indexOf(selectedMember.level);
    if (currentIndex < LEVEL_RANK_ORDER.length - 1) {
      onUpdateLevel(selectedMember.id, LEVEL_RANK_ORDER[currentIndex + 1]);
    }
  };

  const handleDemote = () => {
    if (!selectedMember) return;
    const currentIndex = LEVEL_RANK_ORDER.indexOf(selectedMember.level);
    if (currentIndex > 0) {
      onUpdateLevel(selectedMember.id, LEVEL_RANK_ORDER[currentIndex - 1]);
    }
  };

  const canPromote = selectedMember ? LEVEL_RANK_ORDER.indexOf(selectedMember.level) < LEVEL_RANK_ORDER.length - 1 : false;
  const canDemote = selectedMember ? LEVEL_RANK_ORDER.indexOf(selectedMember.level) > 0 : false;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4">
      {/* Left side: Add Member button / form */}
      <div className="flex items-center gap-3">
        {!isAdding ? (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition shadow-md shadow-indigo-600/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        ) : (
          <form onSubmit={handleAddSubmit} className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-lg border border-slate-700">
            <input
              type="text"
              placeholder="Member Name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              autoFocus
              className="bg-slate-900 text-white text-sm px-3 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-indigo-500 w-44"
            />
            <select
              value={levelInput}
              onChange={(e) => setLevelInput(e.target.value as MemberLevel)}
              className="bg-slate-900 text-white text-sm px-2.5 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-indigo-500 font-semibold"
            >
              <option value="r5">R5 (Leader)</option>
              <option value="r4">R4 (Conductor)</option>
              <option value="r3">R3</option>
              <option value="r2">R2</option>
              <option value="r1">R1</option>
            </select>
            <button
              type="submit"
              disabled={!nameInput.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white p-1.5 rounded transition"
              title="Confirm Add"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="bg-slate-700 hover:bg-slate-600 text-slate-300 p-1.5 rounded transition"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>

      {/* Right side: Selected Member Details & Actions */}
      {selectedMember ? (
        <div className="flex items-center flex-wrap gap-3 bg-slate-800/60 px-4 py-1.5 rounded-lg border border-slate-700">
          <span className="text-xs text-slate-400 font-medium">Selected:</span>
          
          {isEditingName ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                autoFocus
                className="bg-slate-900 text-white text-sm px-2 py-1 rounded border border-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleSaveEdit}
                className="text-emerald-400 hover:text-emerald-300 p-1"
                title="Save Name"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={handleCancelEdit}
                className="text-slate-400 hover:text-slate-300 p-1"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-200 text-sm">{selectedMember.name}</span>
              <button
                onClick={handleStartEdit}
                className="text-slate-400 hover:text-slate-200 transition p-0.5"
                title="Edit Name"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Level selector */}
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-xs text-slate-400">Level:</span>
            <select
              value={selectedMember.level}
              onChange={(e) => onUpdateLevel(selectedMember.id, e.target.value as MemberLevel)}
              className="bg-slate-900 text-white text-xs font-bold uppercase px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="r5">R5</option>
              <option value="r4">R4</option>
              <option value="r3">R3</option>
              <option value="r2">R2</option>
              <option value="r1">R1</option>
            </select>
          </div>

          {/* Promote / Demote buttons */}
          <div className="flex items-center gap-1 ml-1 border-l border-slate-700 pl-2">
            <button
              onClick={handlePromote}
              disabled={!canPromote}
              className="flex items-center gap-1 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-emerald-400 px-2 py-1 rounded transition font-medium"
              title="Promote Member"
            >
              <ArrowUpCircle className="w-3.5 h-3.5" />
              <span>Promote</span>
            </button>
            <button
              onClick={handleDemote}
              disabled={!canDemote}
              className="flex items-center gap-1 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-amber-400 px-2 py-1 rounded transition font-medium"
              title="Demote Member"
            >
              <ArrowDownCircle className="w-3.5 h-3.5" />
              <span>Demote</span>
            </button>
          </div>

          {/* Delete member button */}
          <button
            onClick={() => {
              if (confirm(`Remove ${selectedMember.name} from alliance members?`)) {
                onDeleteMember(selectedMember.id);
              }
            }}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1.5 rounded transition ml-1"
            title="Delete Member"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="text-xs text-slate-500 italic">
          Click any member in the list boxes below to select, edit rank, or bookmark
        </div>
      )}
    </div>
  );
};
