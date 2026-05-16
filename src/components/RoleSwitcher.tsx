import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Eye } from 'lucide-react';
import { useRole } from '../contexts/RoleContext';
import { ROLES, ROLE_META } from '../config/roles';

interface RoleSwitcherProps {
  onRoleChange?: () => void;
}

export default function RoleSwitcher({ onRoleChange }: RoleSwitcherProps) {
  const { role, meta, setRole } = useRole();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
      >
        <Eye className="h-3.5 w-3.5 text-gray-400" />
        <span className="text-xs font-medium text-gray-500">Viewing as</span>
        <span className={`text-xs font-bold ${meta.color}`}>{meta.shortLabel}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Switch View</p>
          </div>
          <div className="max-h-[400px] overflow-y-auto py-1">
            {ROLES.map((r) => {
              const m = ROLE_META[r];
              const isActive = r === role;
              return (
                <button
                  key={r}
                  onClick={() => {
                    setRole(r);
                    setOpen(false);
                    onRoleChange?.();
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full ${m.avatarBg} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-[10px] font-bold text-white">{m.shortLabel.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                        {m.label}
                      </span>
                      {isActive && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{m.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
