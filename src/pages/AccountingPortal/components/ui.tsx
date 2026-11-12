import { useEffect, type ReactNode } from 'react';
import { AlertCircle, Download, Loader2, Printer, X } from 'lucide-react';
import type { Account, AccountType } from '../lib/types';
import { money, PRESET_LABELS, presetRange, TYPE_LABELS, type DateRange, type RangePreset } from '../lib/format';

export const inputCls =
  'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow';
export const btnPrimary =
  'inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-50 disabled:pointer-events-none';
export const btnSecondary =
  'inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 active:scale-[0.98] transition disabled:opacity-50 disabled:pointer-events-none';
export const btnDanger =
  'inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 active:scale-[0.98] transition disabled:opacity-50 disabled:pointer-events-none';
export const btnGhost =
  'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 leading-tight">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 no-print">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl border border-gray-200 ${className}`}>{children}</div>;
}

export function CardHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100">
      <div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

const statTones = {
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  gray: 'bg-gray-100 text-gray-600',
};

export function StatCard({ label, value, hint, icon, tone = 'blue', onClick }: {
  label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: keyof typeof statTones; onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`text-left bg-white rounded-xl border border-gray-200 p-5 transition ${onClick ? 'hover:border-blue-300 hover:shadow-sm cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 tabular-nums truncate">{value}</p>
          {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
        </div>
        {icon && <div className={`p-2.5 rounded-lg ${statTones[tone]}`}>{icon}</div>}
      </div>
    </Tag>
  );
}

export function Money({ value, className = '', colorNegative = false, blankZero = false }: {
  value: number; className?: string; colorNegative?: boolean; blankZero?: boolean;
}) {
  if (blankZero && Math.abs(value) < 0.005) return <span className={className} />;
  const neg = value < -0.004;
  return (
    <span className={`tabular-nums ${colorNegative && neg ? 'text-red-600' : ''} ${className}`}>
      {neg ? `(${money(Math.abs(value))})` : money(value)}
    </span>
  );
}

const badgeTones = {
  gray: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-50 text-blue-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
};
export type BadgeTone = keyof typeof badgeTones;

export function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: BadgeTone }) {
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${badgeTones[tone]}`}>{children}</span>;
}

export function Loading({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
      <Loader2 className="w-4 h-4 animate-spin" /> {label}
    </div>
  );
}

export function ErrorBanner({ message, onClose }: { message: string; onClose?: () => void }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
      <span className="flex-1">{message}</span>
      {onClose && <button onClick={onClose} className="text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>}
    </div>
  );
}

export function EmptyState({ icon, title, message, action }: { icon?: ReactNode; title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      {icon && <div className="p-3 rounded-full bg-gray-100 text-gray-400 mb-3">{icon}</div>}
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      {message && <p className="mt-1 text-sm text-gray-500 max-w-sm">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-gray-400 mt-1">{hint}</span>}
    </label>
  );
}

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const w = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto no-print">
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-[2px] animate-[fadeIn_.15s_ease-out]" onClick={onClose} />
      <div className={`relative w-full ${w} bg-white rounded-xl shadow-xl border border-gray-200 animate-[popIn_.18s_ease-out] my-8`}>
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/60 rounded-b-xl">{footer}</div>}
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit max-w-full overflow-x-auto no-print">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition ${value === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
        >
          {t.label}
          {t.count != null && <span className={`ml-1.5 text-xs ${value === t.id ? 'text-blue-600' : 'text-gray-400'}`}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function DateRangeBar({ range, onChange }: { range: DateRange; onChange: (r: DateRange) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 no-print">
      <select
        value={range.preset}
        onChange={e => {
          const p = e.target.value as RangePreset;
          onChange(p === 'custom' ? { ...range, preset: 'custom' } : presetRange(p));
        }}
        className={`${inputCls} w-auto`}
      >
        {(Object.keys(PRESET_LABELS) as RangePreset[]).map(p => <option key={p} value={p}>{PRESET_LABELS[p]}</option>)}
      </select>
      <input type="date" value={range.from} onChange={e => onChange({ ...range, preset: 'custom', from: e.target.value })} className={`${inputCls} w-auto`} />
      <span className="text-gray-400 text-sm">to</span>
      <input type="date" value={range.to} onChange={e => onChange({ ...range, preset: 'custom', to: e.target.value })} className={`${inputCls} w-auto`} />
    </div>
  );
}

export function ReportActions({ onCsv }: { onCsv?: () => void }) {
  return (
    <>
      <button onClick={() => window.print()} className={btnSecondary}><Printer className="w-4 h-4" /> Print</button>
      {onCsv && <button onClick={onCsv} className={btnSecondary}><Download className="w-4 h-4" /> CSV</button>}
    </>
  );
}

const TYPE_ORDER: AccountType[] = ['asset', 'liability', 'equity', 'income', 'cogs', 'expense'];

export function AccountSelect({ accounts, value, onChange, types, className = '', placeholder = 'Choose account' }: {
  accounts: Account[]; value: string; onChange: (id: string) => void; types?: AccountType[]; className?: string; placeholder?: string;
}) {
  const list = accounts.filter(a => (a.is_active || a.id === value) && (!types || types.includes(a.type)));
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={`${inputCls} ${className}`}>
      <option value="">{placeholder}</option>
      {TYPE_ORDER.filter(t => list.some(a => a.type === t)).map(t => (
        <optgroup key={t} label={TYPE_LABELS[t]}>
          {list.filter(a => a.type === t).map(a => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

export function Th({ children, right = false, className = '' }: { children?: ReactNode; right?: boolean; className?: string }) {
  return <th className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 ${right ? 'text-right' : 'text-left'} ${className}`}>{children}</th>;
}

export function Td({ children, right = false, className = '' }: { children?: ReactNode; right?: boolean; className?: string }) {
  return <td className={`px-4 py-2.5 text-sm ${right ? 'text-right tabular-nums' : ''} ${className}`}>{children}</td>;
}
