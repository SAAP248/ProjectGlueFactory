import { useEffect, type ReactNode } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import type { AgreementStatus } from './lib/domain';
import type { OccurrenceStatus } from './lib/types';

export const STATUS_META: Record<AgreementStatus, { label: string; cls: string; dot: string }> = {
  draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-700 ring-gray-200', dot: 'bg-gray-400' },
  pending_signature: { label: 'Awaiting signature', cls: 'bg-sky-50 text-sky-700 ring-sky-200', dot: 'bg-sky-500' },
  active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  past_due: { label: 'Past due', cls: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' },
  paused: { label: 'Paused', cls: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  pending_renewal: { label: 'Renewal due', cls: 'bg-orange-50 text-orange-700 ring-orange-200', dot: 'bg-orange-500' },
  canceled: { label: 'Canceled', cls: 'bg-gray-100 text-gray-500 ring-gray-200', dot: 'bg-gray-400' },
  expired: { label: 'Expired', cls: 'bg-gray-100 text-gray-500 ring-gray-200', dot: 'bg-gray-300' },
};

export function StatusBadge({ status }: { status: AgreementStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset whitespace-nowrap ${m.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

const OCC_META: Record<OccurrenceStatus, string> = {
  scheduled: 'bg-gray-100 text-gray-600',
  processing: 'bg-sky-50 text-sky-700',
  paid: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-red-50 text-red-700',
  skipped: 'bg-amber-50 text-amber-700',
  void: 'bg-gray-100 text-gray-400 line-through',
};

export function OccurrenceBadge({ status }: { status: OccurrenceStatus }) {
  return <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium capitalize ${OCC_META[status]}`}>{status}</span>;
}

export const PLAN_COLORS: Record<string, { bg: string; text: string; ring: string; solid: string }> = {
  sky: { bg: 'bg-sky-50', text: 'text-sky-700', ring: 'ring-sky-200', solid: 'bg-sky-500' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-200', solid: 'bg-orange-500' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-700', ring: 'ring-teal-200', solid: 'bg-teal-500' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', solid: 'bg-emerald-500' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-200', solid: 'bg-blue-500' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-200', solid: 'bg-rose-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200', solid: 'bg-amber-500' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-700', ring: 'ring-slate-200', solid: 'bg-slate-500' },
};

export function planColor(color: string | undefined | null) {
  return PLAN_COLORS[color ?? ''] ?? PLAN_COLORS.slate;
}

export function PlanChip({ name, color }: { name: string; color?: string | null }) {
  const c = planColor(color);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset ${c.bg} ${c.text} ${c.ring}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.solid}`} />
      {name}
    </span>
  );
}

export function Modal({ title, subtitle, onClose, children, footer, wide }: {
  title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div
        className={`animate-fade-in bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] flex flex-col`}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 -mr-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/60 rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  );
}

export function Btn({ children, onClick, variant = 'secondary', disabled, busy, type = 'button', className = '' }: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean; busy?: boolean; type?: 'button' | 'submit'; className?: string;
}) {
  const styles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
    ghost: 'text-gray-600 hover:bg-gray-100',
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed ${styles} ${className}`}
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
    </label>
  );
}

export const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-shadow';

export function ErrorNote({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function Loading({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

export function Empty({ icon: Icon, title, body, action }: { icon: typeof X; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-gray-400" />
      </div>
      <p className="font-medium text-gray-900">{title}</p>
      {body && <p className="text-sm text-gray-500 mt-1 max-w-sm">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatCard({ label, value, sub, icon: Icon, tone = 'blue', onClick }: {
  label: string; value: ReactNode; sub?: ReactNode; icon: typeof X; tone?: 'blue' | 'emerald' | 'red' | 'amber' | 'sky' | 'gray'; onClick?: () => void;
}) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600', red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600', sky: 'bg-sky-50 text-sky-600', gray: 'bg-gray-100 text-gray-500',
  }[tone];
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`text-left bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3 ${onClick ? 'hover:border-gray-300 hover:shadow-sm transition-all' : ''}`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${tones}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-xl font-semibold text-gray-900 tabular-nums leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </Tag>
  );
}

export function Card({ title, action, children, className = '' }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function errorText(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong. Please try again.';
}
