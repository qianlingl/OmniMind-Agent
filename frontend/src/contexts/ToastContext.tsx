import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { Check, X, Info, AlertTriangle } from 'lucide-react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface ToastState {
  toasts: Toast[];
  toast: (message: string, type?: Toast['type']) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastState>({ toasts: [], toast: () => {}, dismiss: () => {} });

const MAX_TOASTS = 4;
const AUTO_DISMISS = 3500;

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = nextId++;
    setToasts(prev => {
      const next = [...prev, { id, message, type }];
      return next.slice(-MAX_TOASTS);
    });
    setTimeout(() => dismiss(id), AUTO_DISMISS);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(t.id), 300);
    }, AUTO_DISMISS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [t.id, onDismiss]);

  const handleDismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    setTimeout(() => onDismiss(t.id), 300);
  };

  const Icon = t.type === 'success' ? Check
    : t.type === 'error' ? X
    : t.type === 'warning' ? AlertTriangle
    : Info;

  return (
    <div
      className={`toast toast-${t.type}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0) scale(1)' : 'translateX(40px) scale(0.95)',
        transition: 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <span className="toast-icon">
        <Icon size={12} strokeWidth={2.5} />
      </span>
      <span className="toast-message">{t.message}</span>
      <button
        className="toast-dismiss"
        onClick={handleDismiss}
        aria-label="关闭"
      >
        <X size={12} strokeWidth={2.5} />
      </button>
    </div>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
