import React, { useState, useEffect, useRef } from 'react';
import { Edit3, X, Check, Loader2 } from 'lucide-react';

interface RenameModalProps {
  isOpen: boolean;
  title?: string;
  currentTitle: string;
  currentDescription?: string;
  onSave: (newTitle: string, newDescription?: string) => Promise<void> | void;
  onCancel: () => void;
}

export const RenameModal: React.FC<RenameModalProps> = ({
  isOpen,
  title = 'Rename Prototype',
  currentTitle,
  currentDescription = '',
  onSave,
  onCancel
}) => {
  const [newTitle, setNewTitle] = useState(currentTitle);
  const [newDescription, setNewDescription] = useState(currentDescription);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Sync state when modal opens or currentTitle changes
  useEffect(() => {
    if (isOpen) {
      setNewTitle(currentTitle);
      setNewDescription(currentDescription || '');
      setError(null);
      setIsSaving(false);
      // Auto-focus and select the input text after open
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, currentTitle, currentDescription]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      setError('Prototype title cannot be empty.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(trimmedTitle, newDescription.trim());
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename prototype. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanged = newTitle.trim() !== currentTitle || (newDescription.trim() !== (currentDescription || '').trim());
  const isValid = newTitle.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onCancel();
      }}
    >
      <div
        id="rename-prototype-modal"
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-6 pb-4 flex items-start justify-between gap-4 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Edit3 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Update prototype name and description</p>
            </div>
          </div>
          <button
            id="close-rename-modal-btn"
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="rename-title-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Prototype Title <span className="text-rose-500">*</span>
              </label>
              <input
                id="rename-title-input"
                ref={inputRef}
                type="text"
                value={newTitle}
                onChange={(e) => {
                  setNewTitle(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isSaving}
                placeholder="e.g. Checkout Flow V2"
                maxLength={100}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all disabled:opacity-50"
              />
              <p className="text-[11px] text-slate-400 mt-1 flex justify-between">
                <span>Display title across dashboard and review studio</span>
                <span>{newTitle.length}/100</span>
              </p>
            </div>

            <div>
              <label htmlFor="rename-description-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Description <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                id="rename-description-input"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                disabled={isSaving}
                placeholder="Brief summary of prototype features or goals..."
                rows={3}
                maxLength={300}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none disabled:opacity-50"
              />
              <p className="text-[11px] text-slate-400 mt-0.5 text-right">
                {newDescription.length}/300
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 pt-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              id="cancel-rename-modal-btn"
              type="button"
              disabled={isSaving}
              onClick={onCancel}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors shadow-2xs"
            >
              Cancel
            </button>
            <button
              id="save-rename-modal-btn"
              type="submit"
              disabled={isSaving || !isValid || !hasChanged}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
