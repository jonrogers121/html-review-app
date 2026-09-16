import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  itemName?: string;
  confirmLabel?: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  title = 'Delete Prototype',
  message = 'Are you sure you want to permanently delete this item? This action cannot be undone and will remove all associated comments, review pins, and annotations.',
  itemName,
  confirmLabel = 'Delete Prototype',
  isDeleting = false,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        id="delete-confirm-modal"
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header with warning badge */}
        <div className="p-6 pb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Irreversible action</p>
            </div>
          </div>
          <button
            id="close-delete-modal-btn"
            onClick={onCancel}
            disabled={isDeleting}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body content */}
        <div className="px-6 py-2 space-y-3">
          <p className="text-xs text-slate-600 leading-relaxed">
            {message}
          </p>

          {itemName && (
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-2 text-xs font-semibold text-slate-800">
              <Trash2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="truncate">{itemName}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-6 pt-5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            id="cancel-delete-modal-btn"
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors shadow-2xs"
          >
            Cancel
          </button>
          <button
            id="confirm-delete-modal-btn"
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? 'Deleting...' : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
