import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, ShieldAlert, ShieldOff } from 'lucide-react';

interface Props {
  isTroubleCustomer: boolean;
  busy: boolean;
  onToggleTrouble: () => void;
}

export default function MoreActionsMenu({ isTroubleCustomer, busy, onToggleTrouble }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg transition-colors ${
          open ? 'border-gray-400 bg-gray-50' : 'border-gray-300 hover:bg-gray-50'
        }`}
      >
        <MoreHorizontal className="h-4 w-4" />
        More
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-1.5 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <button
            role="menuitem"
            disabled={busy}
            onClick={() => { onToggleTrouble(); setOpen(false); }}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors disabled:opacity-50 ${
              isTroubleCustomer ? 'text-gray-700 hover:bg-gray-50' : 'text-red-600 hover:bg-red-50'
            }`}
          >
            {isTroubleCustomer ? <ShieldOff className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
            {isTroubleCustomer ? 'Remove trouble flag' : 'Flag as trouble customer'}
          </button>
        </div>
      )}
    </div>
  );
}
