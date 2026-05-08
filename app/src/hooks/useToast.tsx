'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'info' | 'loading';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  /** ms — 0 means persistent until manually dismissed */
  duration: number;
}

interface ToastContextType {
  toasts: Toast[];
  success: (message: string, duration?: number) => string;
  error: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
  loading: (message: string) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

// ── Context ────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextType>({
  toasts: [],
  success: () => '',
  error: () => '',
  info: () => '',
  loading: () => '',
  dismiss: () => {},
  dismissAll: () => {},
});

// ── Icons ──────────────────────────────────────────────────────────────────

const ICONS: Record<ToastVariant, string> = {
  success: 'OK',
  error: 'ERR',
  info: 'i',
  loading: '...',
};

const COLORS: Record<ToastVariant, { bg: string; border: string; text: string }> = {
  success: {
    bg: 'rgba(0,255,136,0.07)',
    border: 'rgba(0,255,136,0.25)',
    text: '#00ff88',
  },
  error: {
    bg: 'rgba(244,63,94,0.08)',
    border: 'rgba(244,63,94,0.25)',
    text: '#f43f5e',
  },
  info: {
    bg: 'rgba(0,212,255,0.08)',
    border: 'rgba(0,212,255,0.22)',
    text: '#00d4ff',
  },
  loading: {
    bg: 'rgba(124,58,237,0.1)',
    border: 'rgba(124,58,237,0.28)',
    text: '#a78bfa',
  },
};

// ── Single Toast Item ──────────────────────────────────────────────────────

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animate in
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Auto-dismiss
  useEffect(() => {
    if (toast.duration === 0) return;
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, toast.duration);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [toast.duration, onDismiss]);

  const c = COLORS[toast.variant];

  return (
    <div
      role="status"
      aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.65rem',
        padding: '0.75rem 1rem',
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 'var(--radius-md)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.45)',
        maxWidth: 360,
        transform: visible ? 'translateX(0)' : 'translateX(120%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease',
      }}
    >
      <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: 1 }}>{ICONS[toast.variant]}</span>
      <span
        style={{
          flex: 1,
          fontSize: '0.875rem',
          color: 'var(--text-primary)',
          lineHeight: 1.5,
          wordBreak: 'break-word',
        }}
      >
        {toast.message}
      </span>
      <button
        onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
        aria-label="Dismiss notification"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          fontSize: '0.8rem',
          padding: '0 2px',
          flexShrink: 0,
          marginTop: 1,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}

// ── Provider ───────────────────────────────────────────────────────────────

let _uid = 0;
const uid = () => `toast-${++_uid}`;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const MAX = 4;

  const add = useCallback((message: string, variant: ToastVariant, duration: number): string => {
    const id = uid();
    setToasts((prev) => {
      const next = [...prev, { id, message, variant, duration }];
      return next.length > MAX ? next.slice(next.length - MAX) : next;
    });
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => setToasts([]), []);

  const success = useCallback((m: string, d = 4000) => add(m, 'success', d), [add]);
  const error = useCallback((m: string, d = 7000) => add(m, 'error', d), [add]);
  const info = useCallback((m: string, d = 4000) => add(m, 'info', d), [add]);
  const loading = useCallback((m: string) => add(m, 'loading', 0), [add]);

  return (
    <ToastContext.Provider value={{ toasts, success, error, info, loading, dismiss, dismissAll }}>
      {children}
      {/* Toast container — fixed bottom-right */}
      <div
        aria-label="Notifications"
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem toast={t} onDismiss={() => dismiss(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useToast() {
  return useContext(ToastContext);
}
