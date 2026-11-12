import { createContext, useContext } from 'react';
import type { Account, Nav } from './types';

export type Section =
  | 'home' | 'banking' | 'payables' | 'journal' | 'accounts' | 'reports' | 'close' | 'tax' | 'budgets' | 'settings';

export type GoParams = Record<string, string | undefined>;

export interface PortalContextValue extends Nav {
  accounts: Account[];
  byId: Map<string, Account>;
  byCode: Map<string, Account>;
  reloadAccounts: () => Promise<void>;
  params: GoParams;
  go: (section: Section, params?: GoParams) => void;
  openEntry: (entryId: string) => void;
  actor: string;
  refreshKey: number;
  refresh: () => void;
  notify: (message: string) => void;
}

export const PortalContext = createContext<PortalContextValue | null>(null);

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal must be used inside the accounting portal');
  return ctx;
}
