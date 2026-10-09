import { useEffect, useRef, useState } from 'react';
import { CalendarRange, ChevronDown, Check } from 'lucide-react';
import { PRESET_OPTIONS, toISO, type DateRange, type RangeSelection } from '../lib/dateRange';

interface Props {
  selection: RangeSelection;
  range: DateRange;
  onChange: (sel: RangeSelection) => void;
}

export default function DateRangePicker({ selection, range, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(selection.customFrom || range.from || '');
  const [to, setTo] = useState(selection.customTo || range.to || toISO(new Date()));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const presetLabel =
    selection.preset === 'custom'
      ? 'Custom'
      : PRESET_OPTIONS.find((p) => p.key === selection.preset)?.label || 'Range';

  const toggle = () => {
    if (!open) {
      setFrom(range.from || '');
      setTo(range.to || toISO(new Date()));
    }
    setOpen((v) => !v);
  };

  const customValid = !!from && !!to;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        className={`flex items-center gap-2.5 pl-3 pr-2.5 py-2 rounded-xl border bg-white text-sm transition-all ${
          open ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <CalendarRange className="h-4 w-4 text-blue-600" />
        <span className="font-semibold text-gray-900">{presetLabel}</span>
        <span className="hidden sm:inline text-gray-500">{range.label}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-[min(92vw,460px)] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in">
          <div className="flex flex-col sm:flex-row">
            <div className="sm:w-48 p-2 border-b sm:border-b-0 sm:border-r border-gray-100 grid grid-cols-2 sm:grid-cols-1 gap-0.5">
              {PRESET_OPTIONS.map((p) => {
                const active = selection.preset === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => {
                      onChange({ preset: p.key });
                      setOpen(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                      active ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {p.label}
                    {active && <Check className="h-3.5 w-3.5" />}
                  </button>
                );
              })}
            </div>
            <div className="flex-1 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Custom range</p>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start date</label>
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full mb-3 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <label className="block text-xs font-medium text-gray-600 mb-1">End date</label>
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
                className="w-full mb-4 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                disabled={!customValid}
                onClick={() => {
                  onChange({ preset: 'custom', customFrom: from, customTo: to });
                  setOpen(false);
                }}
                className="w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Apply custom range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
