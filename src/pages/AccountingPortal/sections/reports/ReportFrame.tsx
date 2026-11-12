import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { btnGhost, Card, ReportActions } from '../../components/ui';
import { presetRange, type DateRange } from '../../lib/format';
import type { GoParams } from '../../lib/context';

export interface ReportProps {
  onBack: () => void;
  drill: (accountId: string, from: string, to: string) => void;
  params: GoParams;
}

export function initialRange(params: GoParams, fallback: Parameters<typeof presetRange>[0] = 'this_year'): DateRange {
  if (params.from && params.to) return { preset: 'custom', from: params.from, to: params.to };
  return presetRange(fallback);
}

export function ReportFrame({ title, period, controls, onBack, onCsv, children, note }: {
  title: string; period: string; controls?: ReactNode; onBack: () => void; onCsv?: () => void; children: ReactNode; note?: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <button onClick={onBack} className={`${btnGhost} -ml-2`}><ArrowLeft className="w-4 h-4" /> All reports</button>
        <div className="flex gap-2"><ReportActions onCsv={onCsv} /></div>
      </div>
      {controls && <div className="flex flex-wrap items-center gap-3 no-print">{controls}</div>}
      <Card className="overflow-hidden">
        <div className="text-center px-6 pt-8 pb-6 border-b border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">WorkHorse</p>
          <h2 className="mt-1 text-xl font-bold text-gray-900">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">{period}</p>
        </div>
        {children}
        {note && <div className="px-6 py-4 border-t border-gray-100 text-xs text-gray-500">{note}</div>}
      </Card>
    </div>
  );
}

export type StatementRow =
  | { kind: 'section'; label: string }
  | { kind: 'row'; label: string; values: number[]; accountId?: string; indent?: number; muted?: boolean }
  | { kind: 'total'; label: string; values: number[]; strong?: boolean; indent?: number };

function fmt(v: number) {
  const abs = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (Math.abs(v) < 0.005) return '0.00';
  return v < 0 ? `(${abs})` : abs;
}

export function StatementTable({ columns, rows, onDrill }: {
  columns: string[]; rows: StatementRow[]; onDrill?: (accountId: string, colIndex: number) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="px-6 py-2.5" />
            {columns.map(c => <th key={c} className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            if (r.kind === 'section') {
              return <tr key={i}><td colSpan={columns.length + 1} className="px-6 pt-5 pb-1.5 text-sm font-semibold text-gray-900">{r.label}</td></tr>;
            }
            const pad = { paddingLeft: `${24 + (r.indent ?? 0) * 20}px` };
            if (r.kind === 'total') {
              return (
                <tr key={i} className={r.strong ? 'bg-gray-50' : ''}>
                  <td style={pad} className={`pr-4 py-2 text-sm ${r.strong ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>{r.label}</td>
                  {r.values.map((v, j) => (
                    <td key={j} className={`px-4 py-2 text-sm text-right tabular-nums whitespace-nowrap ${r.strong ? 'font-bold text-gray-900 border-t-2 border-double border-gray-300' : 'font-semibold text-gray-800 border-t border-gray-200'}`}>{fmt(v)}</td>
                  ))}
                </tr>
              );
            }
            return (
              <tr key={i} className="group hover:bg-blue-50/40 transition">
                <td style={pad} className={`pr-4 py-1.5 text-sm ${r.muted ? 'text-gray-500 italic' : 'text-gray-700'}`}>{r.label}</td>
                {r.values.map((v, j) => (
                  <td key={j} className="px-4 py-1.5 text-sm text-right tabular-nums whitespace-nowrap">
                    {r.accountId && onDrill ? (
                      <button onClick={() => onDrill(r.accountId!, j)} className="text-blue-700 hover:underline">{fmt(v)}</button>
                    ) : <span className="text-gray-700">{fmt(v)}</span>}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function statementCsv(columns: string[], rows: StatementRow[]) {
  return [
    ['', ...columns],
    ...rows.map(r => (r.kind === 'section' ? [r.label] : [`${'  '.repeat(r.indent ?? 0)}${r.label}`, ...r.values.map(v => v.toFixed(2))])),
  ];
}
