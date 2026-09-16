/**
 * Lightweight toast notification system.
 *
 * Usage (from anywhere — no props needed):
 *   import { showToast } from './Toast';
 *   showToast('Comment posted!');
 *   showToast('Something went wrong.', 'error');
 */
import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

// Module-level listeners — components subscribe on mount, unsubscribe on unmount
type ToastListener = (toast: Toast) => void;
const listeners: ToastListener[] = [];

export function showToast(message: string, type: ToastType = 'success') {
  const toast: Toast = { id: `${Date.now()}-${Math.random()}`, message, type };
  listeners.forEach((fn) => fn(toast));
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
  error: <XCircle className="w-4 h-4 text-rose-500 shrink-0" />,
  info: <Info className="w-4 h-4 text-indigo-500 shrink-0" />
};

const STYLES: Record<ToastType, string> = {
  success: 'border-emerald-200 bg-white',
  error: 'border-rose-200 bg-white',
  info: 'border-indigo-200 bg-white'
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener: ToastListener = (toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 3500);
    };
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm text-slate-800 font-medium pointer-events-auto animate-in slide-in-from-right-4 fade-in duration-200 max-w-xs ${STYLES[toast.type]}`}
        >
          {ICONS[toast.type]}
          <span className="flex-1 text-xs leading-snug">{toast.message}</span>
          <button
            onClick={() => dismiss(toast.id)}
            className="text-slate-400 hover:text-slate-700 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
