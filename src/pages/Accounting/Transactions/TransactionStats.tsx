import { Banknote, CreditCard, Hash, Landmark, ReceiptText, RotateCcw, Scale, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import Delta from '../../../components/DeltaBadge';
import { formatMoney, type TxnSummary } from './useTransactions';

interface Props {
  current: TxnSummary;
  previous: TxnSummary | null;
  previousLabel: string | null;
}

function Card({ label, value, sub, icon, accent, delta, children }: {
  label: string;
  value: string;
  sub?: string;
  icon: ReactNode;
  accent: string;
  delta?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="group bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>{icon}</div>
        {delta}
      </div>
      <p className="text-sm font-medium text-gray-500 mt-4">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums tracking-tight">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
      {children}
    </div>
  );
}

function ShareBar({ share, color }: { share: number; color: string }) {
  return (
    <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${Math.max(0, Math.min(100, share))}%` }} />
    </div>
  );
}

export default function TransactionStats({ current, previous, previousLabel }: Props) {
  const p = previous ?? undefined;
  const share = (n: number) => (current.gross ? (n / current.gross) * 100 : 0);
  const m = current.byMethod;
  const pm = p?.byMethod;
  const cashWire = m.cash.amount + m.wire.amount;
  const cashWireCount = m.cash.count + m.wire.count;

  const methods = [
    { label: 'Credit Card', amount: m.credit_card.amount, count: m.credit_card.count, prev: pm?.credit_card.amount, icon: <CreditCard className="h-5 w-5 text-blue-600" />, accent: 'bg-blue-50', bar: 'bg-blue-500' },
    { label: 'ACH', amount: m.ach.amount, count: m.ach.count, prev: pm?.ach.amount, icon: <Landmark className="h-5 w-5 text-teal-600" />, accent: 'bg-teal-50', bar: 'bg-teal-500' },
    { label: 'Check', amount: m.check.amount, count: m.check.count, prev: pm?.check.amount, icon: <ReceiptText className="h-5 w-5 text-amber-600" />, accent: 'bg-amber-50', bar: 'bg-amber-500' },
    { label: 'Cash / Wire', amount: cashWire, count: cashWireCount, prev: pm ? pm.cash.amount + pm.wire.amount : undefined, icon: <Banknote className="h-5 w-5 text-rose-500" />, accent: 'bg-rose-50', bar: 'bg-rose-400', extra: `${formatMoney(m.wire.amount, true)} wire · ${formatMoney(m.cash.amount, true)} cash` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 text-white shadow-md sm:col-span-2 xl:col-span-1">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-emerald-400/10" />
          <div className="relative flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-emerald-300" />
            </div>
            {p && <Delta cur={current.net} prev={p.net} />}
          </div>
          <p className="relative text-sm font-medium text-slate-300 mt-4">Total Received</p>
          <p className="relative text-3xl font-bold mt-1 tabular-nums tracking-tight">{formatMoney(current.net)}</p>
          <p className="relative text-xs text-slate-400 mt-1">
            {previousLabel && p ? `vs ${formatMoney(p.net, true)} · ${previousLabel}` : 'Net of refunds'}
          </p>
        </div>
        <Card
          label="Payments"
          value={current.count.toLocaleString()}
          sub="Payments received"
          icon={<Hash className="h-5 w-5 text-slate-600" />}
          accent="bg-slate-100"
          delta={p && <Delta cur={current.count} prev={p.count} />}
        />
        <Card
          label="Average Payment"
          value={formatMoney(current.average)}
          sub={p ? `Was ${formatMoney(p.average)}` : 'Per payment'}
          icon={<Scale className="h-5 w-5 text-sky-600" />}
          accent="bg-sky-50"
          delta={p && <Delta cur={current.average} prev={p.average} />}
        />
        <Card
          label="Refunds"
          value={formatMoney(current.refunds)}
          sub={`${current.refundCount} refund${current.refundCount === 1 ? '' : 's'} issued`}
          icon={<RotateCcw className="h-5 w-5 text-red-500" />}
          accent="bg-red-50"
          delta={p && <Delta cur={current.refunds} prev={p.refunds} invert />}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {methods.map((x) => (
          <Card
            key={x.label}
            label={x.label}
            value={formatMoney(x.amount)}
            sub={x.extra || `${x.count} payment${x.count === 1 ? '' : 's'}`}
            icon={x.icon}
            accent={x.accent}
            delta={p && <Delta cur={x.amount} prev={x.prev} />}
          >
            <div className="flex items-center justify-between text-xs text-gray-500 mt-3">
              <span>{x.extra ? `${x.count} payments` : 'Share of total'}</span>
              <span className="font-semibold text-gray-700 tabular-nums">{share(x.amount).toFixed(1)}%</span>
            </div>
            <ShareBar share={share(x.amount)} color={x.bar} />
          </Card>
        ))}
      </div>
    </div>
  );
}
