import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export default function Toast({ toasts = [], removeToast }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-full max-w-md flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => {
          const bgColors = {
            success: 'bg-white border-emerald-100 shadow-emerald-100/30',
            info: 'bg-white border-blue-100 shadow-blue-100/30',
            warning: 'bg-white border-amber-100 shadow-amber-100/30',
            error: 'bg-white border-rose-100 shadow-rose-100/30',
          };

          const iconColors = {
            success: 'text-emerald-500 bg-emerald-50',
            info: 'text-blue-500 bg-blue-50',
            warning: 'text-amber-500 bg-amber-50',
            error: 'text-rose-500 bg-rose-50',
          };

          const Icon = {
            success: CheckCircle,
            info: Info,
            warning: AlertCircle,
            error: AlertCircle,
          }[toast.type] || Info;

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              role="status"
              className={`pointer-events-auto flex gap-3 rounded-xl border p-4 shadow-lg transition-shadow duration-300 ${bgColors[toast.type] || bgColors.info}`}
              id={`toast-${toast.id}`}
            >
              <div className={`self-start rounded-lg p-2 ${iconColors[toast.type] || iconColors.info}`}>
                <Icon className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                {toast.title && (
                  <h4 className="mb-1 text-sm font-semibold leading-none text-slate-900">
                    {toast.title}
                  </h4>
                )}
                {toast.description && (
                  <p className="text-xs font-normal leading-relaxed text-slate-500">
                    {toast.description}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeToast?.(toast.id)}
                className="self-start rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
                aria-label="Close notification"
                id={`close-toast-${toast.id}`}
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// Custom hook helper for using toasts.
export function useToasts() {
  const [toasts, setToasts] = React.useState([]);

  const showToast = (title, type = 'success', description, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((previous) => [
      ...previous,
      { id, type, title, description },
    ]);

    if (duration > 0) {
      window.setTimeout(() => {
        setToasts((previous) => previous.filter((toast) => toast.id !== id));
      }, duration);
    }

    return id;
  };

  const removeToast = (id) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  };

  return { toasts, showToast, removeToast };
}
