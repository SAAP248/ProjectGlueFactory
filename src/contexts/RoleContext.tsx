import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { ROLE_META, type Role } from '../config/roles';

interface RoleContextValue {
  role: Role;
  meta: typeof ROLE_META[Role];
  setRole: (role: Role) => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);

const STORAGE_KEY = 'workhorse_active_role';

function getInitialRole(): Role {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in ROLE_META) return stored as Role;
  } catch {}
  return 'admin';
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(getInitialRole);

  const setRole = useCallback((newRole: Role) => {
    setRoleState(newRole);
    try {
      localStorage.setItem(STORAGE_KEY, newRole);
    } catch {}
  }, []);

  const value: RoleContextValue = {
    role,
    meta: ROLE_META[role],
    setRole,
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}
